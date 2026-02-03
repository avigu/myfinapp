// services/stockDataProvider.js
// Unified stock data provider
// Quotes:     FMP /stable/quote (individual calls) -> Finnhub quote (price only, no market cap)
// Historical: Alpha Vantage TIME_SERIES_DAILY (cached aggressively)
const axios = require('axios');
const fmpClient = require('../config/fmpApiClient');
const { readCache, writeCache } = require('../utils/cache');
const { createLogger } = require('../utils/logger');

const log = createLogger('STOCK_DATA');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Cache TTLs
const QUOTE_CACHE_MS = 4 * 60 * 60 * 1000;       // 4 hours (prices change during market hours)
const HISTORICAL_CACHE_MS = 24 * 60 * 60 * 1000;  // 24 hours

// In-memory quote cache (shared across requests within the same process)
let quoteCache = { data: {}, timestamp: 0 };

/**
 * Fetch quotes for multiple symbols.
 * Returns cached data where available; only calls FMP for missing/stale tickers.
 * @param {string[]} tickers
 * @returns {Promise<Object>} ticker -> { price, marketCap, ... }
 */
async function getBatchQuotes(tickers) {
  if (!tickers || tickers.length === 0) return {};

  const flowStart = log.flowStart('getBatchQuotes', { tickers: tickers.length });
  const now = Date.now();

  // Check in-memory cache — return immediately if all tickers are fresh
  const memoryFresh = quoteCache.timestamp && (now - quoteCache.timestamp < QUOTE_CACHE_MS);
  if (memoryFresh) {
    const missing = tickers.filter(t => !quoteCache.data[t]);
    if (missing.length === 0) {
      log.cacheHit('quotes (memory, all tickers)');
      const result = {};
      tickers.forEach(t => { result[t] = quoteCache.data[t]; });
      log.flowEnd('getBatchQuotes', flowStart, { source: 'memory-cache', count: tickers.length });
      return result;
    }
  }

  // Load persistent cache to fill gaps
  let persistedQuotes = {};
  if (!memoryFresh) {
    persistedQuotes = await readCache('batch-quotes', QUOTE_CACHE_MS) || {};
    if (Object.keys(persistedQuotes).length > 0) {
      // Merge persisted data into memory cache
      quoteCache = { data: persistedQuotes, timestamp: now };
      log.cacheHit('quotes (persistent)');
    }
  }

  // Determine which tickers still need fetching
  const toFetch = tickers.filter(t => !quoteCache.data[t]);

  if (toFetch.length > 0) {
    log.cacheMiss('quotes', { missing: toFetch.length, total: tickers.length });

    // Fetch from FMP (individual calls, rate-limited internally)
    let fmpResults = {};
    if (fmpClient.canMakeCall()) {
      log.info('Fetching quotes from FMP', { count: toFetch.length });
      fmpResults = await fmpClient.getQuotes(toFetch);
      log.info('FMP quotes received', { received: Object.keys(fmpResults).length });
    } else {
      log.warn('FMP daily limit reached, skipping to Finnhub fallback');
    }

    // For any tickers FMP couldn't provide, try Finnhub (price only, no market cap)
    const stillMissing = toFetch.filter(t => !fmpResults[t]);
    if (stillMissing.length > 0) {
      log.info('Falling back to Finnhub for missing tickers', { count: stillMissing.length });
      for (const ticker of stillMissing) {
        const quote = await getFinnhubQuote(ticker);
        if (quote) fmpResults[ticker] = quote;
        await new Promise(resolve => setTimeout(resolve, 80));
      }
    }

    // Merge new results into cache
    if (Object.keys(fmpResults).length > 0) {
      quoteCache.data = { ...quoteCache.data, ...fmpResults };
      quoteCache.timestamp = now;
      await writeCache('batch-quotes', quoteCache.data);
      log.cacheWrite('batch-quotes');
    }
  }

  // Build result from cache
  const result = {};
  tickers.forEach(t => { if (quoteCache.data[t]) result[t] = quoteCache.data[t]; });

  log.flowEnd('getBatchQuotes', flowStart, {
    requested: tickers.length,
    received: Object.keys(result).length,
    apiStatus: fmpClient.getApiStatus()
  });

  return result;
}

/**
 * Finnhub quote fallback — returns price but no market cap
 */
async function getFinnhubQuote(ticker) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
    const response = await axios.get(url, { timeout: 10000 });
    if (response.data && response.data.c) {
      return {
        price: response.data.c,
        marketCap: null, // Finnhub quote doesn't include market cap
        previousClose: response.data.pc,
        change: response.data.d,
        changesPercentage: response.data.dp
      };
    }
    return null;
  } catch (error) {
    log.debug('Finnhub quote error', { ticker, error: error.message });
    return null;
  }
}

/**
 * Fetch historical daily prices using Alpha Vantage TIME_SERIES_DAILY.
 * Alpha Vantage returns ~100 days of compact data in one call — we filter to the requested range.
 * Cached per-ticker for 24h.
 * @param {string} ticker
 * @param {number} fromUnix - start (seconds)
 * @param {number} toUnix   - end (seconds)
 * @param {Object} cacheFiles - per-request in-memory cache to avoid repeated GCS reads
 * @returns {Promise<Object>} { s, c, t }
 */
async function getHistoricalPrices(ticker, fromUnix, toUnix, cacheFiles = {}) {
  if (!Number.isFinite(fromUnix) || !Number.isFinite(toUnix) || fromUnix >= toUnix) {
    log.error('Invalid date range', { ticker, fromUnix, toUnix });
    return { s: 'error', c: [], t: [] };
  }

  const cacheKey = `hist-${ticker}`;
  const rangeKey = `${fromUnix}-${toUnix}`;

  // Per-request memory cache
  if (cacheFiles[cacheKey] && cacheFiles[cacheKey][rangeKey]) {
    return cacheFiles[cacheKey][rangeKey];
  }

  // Persistent cache (per ticker, stores full AV response filtered by range)
  const persistedHist = await readCache(cacheKey, HISTORICAL_CACHE_MS);
  if (persistedHist && persistedHist[rangeKey]) {
    log.cacheHit(`historical-${ticker}`);
    if (!cacheFiles[cacheKey]) cacheFiles[cacheKey] = {};
    cacheFiles[cacheKey][rangeKey] = persistedHist[rangeKey];
    return persistedHist[rangeKey];
  }

  log.cacheMiss(`historical-${ticker}`);

  // Fetch from Alpha Vantage
  const result = await getAlphaVantageDaily(ticker, fromUnix, toUnix);

  // Cache the result
  if (result.s === 'ok') {
    if (!cacheFiles[cacheKey]) cacheFiles[cacheKey] = {};
    cacheFiles[cacheKey][rangeKey] = result;

    const tickerCache = persistedHist || {};
    tickerCache[rangeKey] = result;
    await writeCache(cacheKey, tickerCache);
  }

  return result;
}

/**
 * Alpha Vantage TIME_SERIES_DAILY — returns ~100 days compact.
 * We filter to [fromUnix, toUnix] range.
 */
async function getAlphaVantageDaily(ticker, fromUnix, toUnix) {
  if (!ALPHA_VANTAGE_API_KEY) {
    log.warn('ALPHA_VANTAGE_API_KEY not set');
    return { s: 'error', c: [], t: [] };
  }

  const apiStart = log.apiCall('AlphaVantage', `daily(${ticker})`);

  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await axios.get(url, { timeout: 30000 });

    log.apiResult('AlphaVantage', `daily(${ticker})`, apiStart, true);

    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
      // Could be rate-limited ("Information" or "Note" in response)
      if (response.data.Information || response.data.Note) {
        log.warn('Alpha Vantage rate limited or error', { ticker, note: response.data.Note || response.data.Information });
      }
      return { s: 'no_data', c: [], t: [] };
    }

    // AV returns dates as keys in YYYY-MM-DD format, descending order
    const entries = Object.entries(timeSeries);

    // Filter to requested range and sort ascending
    const filtered = entries
      .map(([dateStr, vals]) => ({
        t: Math.floor(new Date(dateStr + 'T00:00:00').getTime() / 1000),
        c: parseFloat(vals['4. close'])
      }))
      .filter(d => d.t >= fromUnix && d.t <= toUnix)
      .sort((a, b) => a.t - b.t);

    if (filtered.length === 0) {
      return { s: 'no_data', c: [], t: [] };
    }

    return {
      s: 'ok',
      c: filtered.map(d => d.c),
      t: filtered.map(d => d.t)
    };
  } catch (error) {
    log.apiResult('AlphaVantage', `daily(${ticker})`, apiStart, false);
    log.warn('Alpha Vantage request failed', { ticker, error: error.message });
    return { s: 'error', c: [], t: [] };
  }
}

/**
 * Get current price for a single ticker
 */
async function getCurrentPrice(ticker) {
  const quotes = await getBatchQuotes([ticker]);
  return quotes[ticker]?.price || null;
}

/**
 * Get market cap for a single ticker
 */
async function getMarketCap(ticker) {
  const quotes = await getBatchQuotes([ticker]);
  return quotes[ticker]?.marketCap || null;
}

/**
 * Get API usage status
 */
function getApiStatus() {
  return {
    fmp: fmpClient.getApiStatus(),
    cacheAge: quoteCache.timestamp ? Date.now() - quoteCache.timestamp : null,
    cachedTickers: Object.keys(quoteCache.data).length
  };
}

module.exports = {
  getBatchQuotes,
  getHistoricalPrices,
  getCurrentPrice,
  getMarketCap,
  getApiStatus
};
