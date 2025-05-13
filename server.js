require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const yahooFinance = require('yahoo-finance2').default;
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd0gfql9r01qhao4tdc6gd0gfql9r01qhao4tdc70'; // Ensure you have this in .env

const DATA_DIR = path.join(__dirname, '.data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// --- In-memory and file-backed caches for historical prices and market cap ---
const HISTORICAL_CACHE_FILE = path.join(DATA_DIR, 'historical-all.json');
const MARKETCAP_CACHE_FILE = path.join(DATA_DIR, 'marketcap-all.json');
let historicalCache = {};
let marketCapCache = {};

// Load caches from disk if they exist
if (fs.existsSync(HISTORICAL_CACHE_FILE)) {
  try { historicalCache = JSON.parse(fs.readFileSync(HISTORICAL_CACHE_FILE, 'utf8')); } catch {}
}
if (fs.existsSync(MARKETCAP_CACHE_FILE)) {
  try { marketCapCache = JSON.parse(fs.readFileSync(MARKETCAP_CACHE_FILE, 'utf8')); } catch {}
}

function saveHistoricalCache() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(HISTORICAL_CACHE_FILE, JSON.stringify(historicalCache), 'utf8');
}
function saveMarketCapCache() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(MARKETCAP_CACHE_FILE, JSON.stringify(marketCapCache), 'utf8');
}

function getCacheFilePath(name) {
  return path.join(DATA_DIR, name + '.json');
}

function readCache(name, maxAgeMs) {
  const file = getCacheFilePath(name);
  if (!fs.existsSync(file)) return null;
  try {
    const { timestamp, data } = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() - timestamp < maxAgeMs) return data;
  } catch {}
  return null;
}

function writeCache(name, data) {
  // Always ensure the directory exists before writing
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = getCacheFilePath(name);
  fs.writeFileSync(file, JSON.stringify({ timestamp: Date.now(), data }), 'utf8');
}

function loadCacheFile(file) {
  if (fs.existsSync(file)) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  return {};
}
function saveCacheFile(file, obj) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj), 'utf8');
}

app.use(express.static('public'));

// --- Helper Functions (adapted from index.js) ---
let cachedSP500Tickers = null;
let cachedSP500NameMap = null;
const TICKERS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getSP500TickersCached() {
  const cache = readCache('sp500-tickers', TICKERS_CACHE_MS);
  if (cache) {
    cachedSP500Tickers = cache.tickers;
    cachedSP500NameMap = cache.nameMap;
    return [cachedSP500Tickers, cachedSP500NameMap];
  }
  if (cachedSP500Tickers && cachedSP500NameMap) return [cachedSP500Tickers, cachedSP500NameMap];
  const { tickers, nameMap } = await getSP500Tickers();
  cachedSP500Tickers = tickers;
  cachedSP500NameMap = nameMap;
  writeCache('sp500-tickers', { tickers, nameMap });
  return [cachedSP500Tickers, cachedSP500NameMap];
}

async function getSP500Tickers() {
  console.log('Fetching S&P 500 tickers from Wikipedia...');
  const url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies';
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const tickers = [];
  const nameMap = {};
  $('table.wikitable tbody tr').each((i, elem) => {
    const symbol = $(elem).find('td').first().text().trim();
    const name = $(elem).find('td').eq(1).text().trim();
    if (
      symbol &&
      symbol !== 'Symbol' &&
      symbol !== 'SP500' &&
      /^[A-Z.-]{1,6}$/.test(symbol) &&
      !symbol.includes(' ')
    ) {
      const ticker = symbol.replace('.', '-');
      tickers.push(ticker);
      nameMap[ticker] = name;
    }
  });
  // Remove any accidental 'SP500' or non-ticker entries
  let filteredTickers = tickers.filter(t => t !== 'SP500' && /^[A-Z-]{1,6}$/.test(t));
  return {
    tickers: filteredTickers,
    nameMap
  };
}

const MARKETCAP_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getMarketCap(ticker) {
  const now = Date.now();
  const entry = marketCapCache[ticker];
  if (entry && (now - entry.timestamp < MARKETCAP_CACHE_MS)) {
    return entry.value;
  }
  try {
    const quote = await yahooFinance.quoteSummary(ticker, { modules: ['price'] });
    const cap = quote.price.marketCap || null;
    marketCapCache[ticker] = { value: cap, timestamp: now };
    saveMarketCapCache();
    return cap;
  } catch (err) {
    console.log(`${ticker}: Error fetching market cap from Yahoo: ${err.message}`);
    return null;
  }
}

const HISTORICAL_CACHE_MS = 1 * 60 * 60 * 1000; // 1 hour

function getHistoricalCacheFile(indexKey) {
  return path.join(DATA_DIR, `historical-all-${indexKey}.json`);
}

async function getHistoricalPrices(indexKey, ticker, from, to) {
  // Defensive: check from and to are valid
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
    console.log(`[WARN] Skipping getHistoricalPrices for ${ticker}: invalid from/to (${from}, ${to})`);
    return { s: 'error', c: [], t: [] };
  }
  const file = getHistoricalCacheFile(indexKey);
  let cache = loadCacheFile(file);
  const now = Date.now();
  if (!cache[ticker]) cache[ticker] = {};
  const key = `${from}-${to}`;
  const entry = cache[ticker][key];
  if (entry && (now - entry.timestamp < HISTORICAL_CACHE_MS)) {
    return entry.value;
  }
  try {
    const fromDate = new Date(from * 1000).toISOString().slice(0, 10);
    const toDate = new Date(to * 1000).toISOString().slice(0, 10);
    const history = await yahooFinance.historical(ticker, { period1: fromDate, period2: toDate, interval: '1d' });
    const result = { s: history.length > 1 ? 'ok' : 'no_data', c: history.map(day => day.close), t: history.map(day => Math.floor(new Date(day.date).getTime() / 1000)) };
    cache[ticker][key] = { value: result, timestamp: now };
    saveCacheFile(file, cache);
    return result;
  } catch (err) {
    console.log(`${ticker}: Error fetching historical prices from Yahoo: ${err.message}`);
    return { s: 'error', c: [], t: [] };
  }
}

const EARNINGS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getRecentEarningsCalendar(from, to) {
  const cacheKey = `earnings-${from}-${to}`;
  const cache = readCache(cacheKey, EARNINGS_CACHE_MS);
  if (cache) {
    return cache;
  }
  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
  try {
    const response = await axios.get(url);
    writeCache(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching Finnhub earnings calendar:', error.message);
    return { earningsCalendar: [] }; // Return a default structure in case of error
  }
}

// Cache for upcoming earnings
let cachedUpcomingEarnings = null;
let cachedUpcomingEarningsTime = 0;
const UPCOMING_EARNINGS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getUpcomingRelevantEarnings() {
  const now = new Date();
  if (cachedUpcomingEarnings && (Date.now() - cachedUpcomingEarningsTime < UPCOMING_EARNINGS_CACHE_MS)) {
    return cachedUpcomingEarnings;
  }
  const fromDate = now.toISOString().slice(0, 10);
  const toDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const earningsCalendarData = await getRecentEarningsCalendar(fromDate, toDate);
  const [sp500Tickers, sp500NameMap] = await getSP500TickersCached();
  const sp500Set = new Set(sp500Tickers);
  const earningsArray = earningsCalendarData.earningsCalendar || [];
  const relevant = [];
  for (const earning of earningsArray) {
    if (!earning || !earning.symbol || !sp500Set.has(earning.symbol)) continue;
    try {
      const marketCap = await getMarketCap(earning.symbol);
      if (!marketCap || marketCap < 5_000_000_000) continue;
      relevant.push({
        ticker: earning.symbol,
        name: sp500NameMap[earning.symbol] || '',
        date: earning.date,
        marketCap
      });
    } catch {}
  }
  // Sort by date ascending
  cachedUpcomingEarnings = relevant.sort((a, b) => new Date(a.date) - new Date(b.date));
  cachedUpcomingEarningsTime = Date.now();
  return cachedUpcomingEarnings;
}

// --- Main Logic Function ---
async function getSP500InvestmentOpportunities(now = new Date()) {
  // Timing and network call counters
  let tTickers0 = Date.now();
  let tickerCalls = 0;
  let tTickers1, tEarnings0, tEarnings1, tHistTotal = 0, tPriceTotal = 0;
  let earningsCalls = 0;
  let historyCalls = 0;
  let currentPriceCalls = 0;

  tEarnings0 = Date.now();
  const fromDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate = now.toISOString().slice(0, 10);
  const earningsCalendarData = await getRecentEarningsCalendar(fromDate, toDate); earningsCalls++;
  tEarnings1 = Date.now();

  tTickers1 = Date.now();
  const tTickersStart = Date.now();
  const [sp500Tickers, sp500NameMap] = await getSP500TickersCached(); tickerCalls++;
  const tTickersEnd = Date.now();
  const sp500Set = new Set(sp500Tickers);
  console.log(`[LOG] Got earning calendar - ${earningsCalendarData.earningsCalendar} `);
  const earningsArray = earningsCalendarData.earningsCalendar || [];
  const sp500Earnings = earningsArray.filter(e => e && e.symbol && sp500Set.has(e.symbol));
  console.log('S&P 500 tickers with earning events:', sp500Earnings.map(e => e.symbol));

  const results = [];
  const nowUnix = Math.floor(now.getTime() / 1000);
  console.log(`[LOG] Got ${sp500Earnings} S&P 500 earnings`);
  for (const earning of sp500Earnings) {
    const ticker = earning.symbol;
    if (!ticker) continue;
    const earningsDate = new Date(earning.date);
    const earningsUnix = Math.floor(earningsDate.getTime() / 1000);
    try {
      const tHist0 = Date.now();
      const marketCap = await getMarketCap(ticker);
      if (!marketCap || marketCap < 5_000_000_000) continue;
      // Fetch up to a week before earnings to ensure we get the last trading day
      const daysBack = 7;
      const fromUnixForHistory = earningsUnix - daysBack * 86400;
      const toUnixForHistory = earningsUnix;
      const history = await getHistoricalPrices(ticker, fromUnixForHistory, toUnixForHistory); historyCalls++;
      console.log(`[LOG] Got historical prices for ${ticker}:`, history);
      const tHist1 = Date.now();
      tHistTotal += (tHist1 - tHist0);
      if (!history || !history.c || history.c.length < 1) {
        continue;
      }
      // Find the last trading day before the earnings date
      let priceBeforeEarnings = null;
      for (let i = history.t.length - 1; i >= 0; i--) {
        if (history.t[i] < earningsUnix) {
          priceBeforeEarnings = history.c[i];
          break;
        }
      }
      if (priceBeforeEarnings === null) {
        console.log(`[WARN] No trading day before earnings for ${ticker} (${earning.date})`);
        continue;
      }
      // Get live price
      const tPrice0 = Date.now();
      const liveQuote = await yahooFinance.quoteSummary(ticker, { modules: ['price'] }); currentPriceCalls++;
      console.log(`[LOG] Got quote summary for ${ticker}:`, liveQuote);
      const tPrice1 = Date.now();
      tPriceTotal += (tPrice1 - tPrice0);
      const priceNow = liveQuote.price.regularMarketPrice;
      if (!priceNow) {
        continue;
      }
      const change = ((priceNow - priceBeforeEarnings) / priceBeforeEarnings) * 100;
      results.push({
        ticker,
        name: sp500NameMap[ticker] || '',
        earningsDate: earning.date,
        marketCap,
        priceBeforeEarnings,
        priceNow,
        change
      });
    } catch (err) {
      console.log(`${ticker}: Error processing in main logic: ${err.message}`);
    }
  }
  // Log timings and network calls
  console.log(`[MEASURE] Time to fetch earnings: ${tEarnings1 - tEarnings0}ms, network calls: ${earningsCalls}`);
  console.log(`[MEASURE] Time to fetch tickers: ${tTickersEnd - tTickersStart}ms, network calls: ${tickerCalls}`);
  console.log(`[MEASURE] Time to fetch historical prices: ${tHistTotal}ms, network calls: ${historyCalls}`);
  console.log(`[MEASURE] Time to fetch current prices: ${tPriceTotal}ms, network calls: ${currentPriceCalls}`);
  return results.sort((a, b) => b.change - a.change);
}

function renderTabbedHtml({ indexKey, startDate, topGainers, topLosers, opportunities, upcomingEarnings }) {
  const index = INDICES[indexKey];
  const otherKey = indexKey === 'sp500' ? 'nasdaq' : 'sp500';
  const otherIndex = INDICES[otherKey];
  return `
    <html>
      <head>
        <title>${index.name} Investment Opportunities</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="manifest" href="/manifest.json">
        <link rel="icon" href="/icon-192.png">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { color: #333; }
          ul { list-style-type: none; padding: 0; }
          li { background: #f4f4f4; margin: 5px 0; padding: 10px; border-radius: 5px; }
          .gainer { color: green; }
          .loser { color: red; }
          .loading { display: none; color: #007bff; font-weight: bold; }
          form { margin-bottom: 20px; }
          label { margin-right: 10px; }
          button { padding: 6px 16px; border-radius: 4px; border: none; background: #007bff; color: #fff; font-size: 1em; }
          button:active { background: #0056b3; }
          .tabs { display: flex; margin-bottom: 20px; }
          .tab { flex: 1; text-align: center; padding: 10px; cursor: pointer; background: #eee; border-radius: 5px 5px 0 0; margin-right: 2px; }
          .tab.active { background: #fff; border-bottom: 2px solid #007bff; font-weight: bold; }
          @media (max-width: 600px) {
            body { margin: 5px; font-size: 16px; }
            h1 { font-size: 1.5em; }
            h2 { font-size: 1.1em; }
            li { padding: 8px; font-size: 1em; }
            button { width: 100%; margin-top: 10px; }
            .tabs { flex-direction: column; }
            .tab { margin-bottom: 2px; }
          }
        </style>
        <script>
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/service-worker.js');
            });
          }
        </script>
      </head>
      <body>
        <div class="tabs">
          <a href="/" class="tab${indexKey === 'sp500' ? ' active' : ''}">S&amp;P 500</a>
          <a href="/nasdaq" class="tab${indexKey === 'nasdaq' ? ' active' : ''}">NASDAQ</a>
        </div>
        <h1>${index.name} Investment Opportunities</h1>
        <form id="dateForm">
          <label for="start">Start date:</label>
          <input type="date" id="start" name="start" value="${startDate}">
          <button type="submit">Refresh</button>
          <span class="loading" id="loading">Loading...</span>
        </form>
        <script>
          const form = document.getElementById('dateForm');
          const loading = document.getElementById('loading');
          form.addEventListener('submit', function(e) {
            e.preventDefault();
            loading.style.display = 'inline';
            const start = document.getElementById('start').value;
            let base = window.location.pathname === '/nasdaq' ? '/nasdaq' : '/';
            window.location = base + '?start=' + start;
          });
          if (window.location.search.includes('start=')) {
            loading.style.display = 'none';
          }
        </script>
        <h2>${index.gainersTitle}</h2><ul>` +
    topGainers.map(stock => `<li>${stock.ticker} (${stock.name}): <span class="gainer">${stock.change.toFixed(2)}%</span> (from $${stock.priceBeforeEarnings.toFixed(2)} to $${stock.priceNow.toFixed(2)})</li>`).join('') +
    `</ul><h2>${index.losersTitle}</h2><ul>` +
    topLosers.map(stock => `<li>${stock.ticker} (${stock.name}): <span class="loser">${stock.change.toFixed(2)}%</span> (from $${stock.priceBeforeEarnings.toFixed(2)} to $${stock.priceNow.toFixed(2)})</li>`).join('') +
    `</ul><h2>Summary</h2><p><strong>${opportunities.length}</strong> ${index.earningsSummary}</p>` +
    `<h2>${index.upcomingTitle}</h2><ul>` +
    (upcomingEarnings.length === 0 ? '<li>No relevant upcoming earnings found.</li>' :
      upcomingEarnings.map(e => `<li>${e.ticker} (${e.name}): ${e.date}${e.marketCap ? ` (Market Cap: $${(e.marketCap/1e9).toFixed(1)}B)` : ''}</li>`).join('')) +
    '</ul></body></html>';
}

// --- Unified Main Logic ---
async function getInvestmentOpportunities(indexKey, now = new Date()) {
  const index = INDICES[indexKey];
  // Timing and network call counters
  let tTickers0 = Date.now();
  let tickerCalls = 0;
  let tTickers1, tEarnings0, tEarnings1, tHistTotal = 0, tPriceTotal = 0;
  let earningsCalls = 0;
  let historyCalls = 0;
  let currentPriceCalls = 0;

  // Fetch earnings
  tEarnings0 = Date.now();
  const fromDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate = now.toISOString().slice(0, 10);
  const earningsCalendarData = await getRecentEarningsCalendar(fromDate, toDate); earningsCalls++;
  tEarnings1 = Date.now();

  // Fetch tickers
  tTickers1 = Date.now();
  const tTickersStart = Date.now();
  let [tickers, nameMap] = await getTickersCached(indexKey); tickerCalls++;
  console.log(`[LOG] Got ${tickers.length} tickers for ${indexKey}:`, tickers.slice(0, 20));
  const tTickersEnd = Date.now();
  const tickerSet = new Set(tickers);
  const earningsArray = earningsCalendarData.earningsCalendar || [];
  const relevantEarnings = earningsArray.filter(e => e && e.symbol && tickerSet.has(e.symbol));
  const results = [];
  console.log(`[LOG] Got ${relevantEarnings.length} relevant earnings for ${indexKey}:`, relevantEarnings.map(e => e.symbol).slice(0, 20));
  for (const earning of relevantEarnings) {
    const ticker = earning.symbol;
    // Defensive: skip invalid tickers
    if (!ticker || ticker === 'SP500' || !/^[A-Z.-]{1,6}$/.test(ticker)) continue;
    const earningsDate = new Date(earning.date);
    if (isNaN(earningsDate.getTime())) {
      console.log(`[WARN] Skipping ${ticker}: invalid earnings date "${earning.date}"`);
      continue;
    }
    const earningsUnix = Math.floor(earningsDate.getTime() / 1000);
    if (!Number.isFinite(earningsUnix)) {
      console.log(`[WARN] Skipping ${ticker}: invalid earningsUnix "${earningsUnix}"`);
      continue;
    }
    try {
      // Fetch market cap (network call if not cached)
      const tHist0 = Date.now();
      const marketCap = await getMarketCap(ticker);
      if (!marketCap || marketCap < index.minMarketCap) continue;
      // Fetch historical prices
      const daysBack = 7;
      const fromUnixForHistory = earningsUnix - daysBack * 86400;
      const toUnixForHistory = earningsUnix;
      // Defensive: check from/to are valid
      if (!Number.isFinite(fromUnixForHistory) || !Number.isFinite(toUnixForHistory)) {
        console.log(`[WARN] Skipping ${ticker}: invalid from/to unix (${fromUnixForHistory}, ${toUnixForHistory})`);
        continue;
      }
      const history = await getHistoricalPrices(indexKey, ticker, fromUnixForHistory, toUnixForHistory); historyCalls++;
      const tHist1 = Date.now();
      tHistTotal += (tHist1 - tHist0);
      if (!history || !history.c || history.c.length < 1) continue;
      // Find the last trading day before the earnings date
      let priceBeforeEarnings = null;
      for (let i = history.t.length - 1; i >= 0; i--) {
        if (history.t[i] < earningsUnix) {
          priceBeforeEarnings = history.c[i];
          break;
        }
      }
      if (priceBeforeEarnings === null) {
        console.log(`[WARN] No trading day before earnings for ${ticker} (${earning.date})`);
        continue;
      }
      // Fetch current price
      const tPrice0 = Date.now();
      const liveQuote = await yahooFinance.quoteSummary(ticker, { modules: ['price'] }); currentPriceCalls++;
      const tPrice1 = Date.now();
      tPriceTotal += (tPrice1 - tPrice0);
      const priceNow = liveQuote.price.regularMarketPrice;
      if (!priceNow) continue;
      const change = ((priceNow - priceBeforeEarnings) / priceBeforeEarnings) * 100;
      results.push({
        ticker,
        name: nameMap[ticker] || '',
        earningsDate: earning.date,
        marketCap,
        priceBeforeEarnings,
        priceNow,
        change
      });
    } catch (err) {
      console.log(`${ticker}: Error processing in main logic: ${err.message}`);
    }
  }
  // Log timings and network calls
  console.log(`[MEASURE] Time to fetch earnings: ${tEarnings1 - tEarnings0}ms, network calls: ${earningsCalls}`);
  console.log(`[MEASURE] Time to fetch tickers: ${tTickersEnd - tTickersStart}ms, network calls: ${tickerCalls}`);
  console.log(`[MEASURE] Time to fetch historical prices: ${tHistTotal}ms, network calls: ${historyCalls}`);
  console.log(`[MEASURE] Time to fetch current prices: ${tPriceTotal}ms, network calls: ${currentPriceCalls}`);
  return results.sort((a, b) => b.change - a.change);
}

async function getUpcomingRelevantEarnings(indexKey) {
  const index = INDICES[indexKey];
  const now = new Date();
  const fromDate = now.toISOString().slice(0, 10);
  const toDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const earningsCalendarData = await getRecentEarningsCalendar(fromDate, toDate);
  const [tickers, nameMap] = await getTickersCached(indexKey);
  const tickerSet = new Set(tickers);
  const earningsArray = earningsCalendarData.earningsCalendar || [];
  const relevant = [];
  for (const earning of earningsArray) {
    if (!earning || !earning.symbol || !tickerSet.has(earning.symbol)) continue;
    try {
      const marketCap = await getMarketCap(earning.symbol);
      if (!marketCap || marketCap < index.minMarketCap) continue;
      relevant.push({
        ticker: earning.symbol,
        name: nameMap[earning.symbol] || '',
        date: earning.date,
        marketCap
      });
    } catch {}
  }
  return relevant.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// --- Unified Helper Functions ---
async function getTickersCached(indexKey) {
  const index = INDICES[indexKey];
  const cacheName = `${index.cachePrefix}-tickers`;
  const cache = readCache(cacheName, TICKERS_CACHE_MS);
  if (cache) {
    return [cache.tickers, cache.nameMap];
  }
  const { tickers, nameMap } = await index.getTickers();
  writeCache(cacheName, { tickers, nameMap });
  return [tickers, nameMap];
}

// --- Express Routes ---
app.get(['/', '/nasdaq'], async (req, res) => {
  try {
    const indexKey = req.path === '/nasdaq' ? 'nasdaq' : 'sp500';
    const startDate = req.query.start || new Date().toISOString().slice(0, 10);
    const now = new Date(startDate);
    const opportunities = await getInvestmentOpportunities(indexKey, now);
    const topGainers = opportunities.slice(0, 5);
    const topLosers = opportunities.filter(stock => stock.change < 0).slice(-5).reverse();
    const upcomingEarnings = await getUpcomingRelevantEarnings(indexKey);
    res.send(renderTabbedHtml({ indexKey, startDate, topGainers, topLosers, opportunities, upcomingEarnings }));
  } catch (error) {
    console.error('Error generating page:', error);
    res.status(500).send('Error generating investment opportunities page.');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// --- Index Configurations ---
const INDICES = {
  sp500: {
    name: 'S&P 500',
    cachePrefix: 'sp500',
    tickersUrl: 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies',
    getTickers: async function () {
      const url = this.tickersUrl;
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const tickers = [];
      const nameMap = {};
      $('table.wikitable tbody tr').each((i, elem) => {
        const symbol = $(elem).find('td').first().text().trim();
        const name = $(elem).find('td').eq(1).text().trim();
        if (
          symbol &&
          symbol !== 'Symbol' &&
          symbol !== 'SP500' &&
          /^[A-Z.-]{1,6}$/.test(symbol) &&
          !symbol.includes(' ')
        ) {
          const ticker = symbol.replace('.', '-');
          tickers.push(ticker);
          nameMap[ticker] = name;
        }
      });
      // Remove any accidental 'SP500' or non-ticker entries
      let filteredTickers = tickers.filter(t => t !== 'SP500' && /^[A-Z-]{1,6}$/.test(t));
      return {
        tickers: filteredTickers,
        nameMap
      };
    },
    minMarketCap: 5_000_000_000,
    earningsSummary: 'S&P 500 stocks had earnings in the last 10 days.',
    upcomingTitle: 'Upcoming S&P 500 Earnings (Next 5 Days, Market Cap > $5B)',
    gainersTitle: 'Top 5 Positive Changes (Day Before Earnings to Today)',
    losersTitle: 'Top 5 Drops (Day Before Earnings to Today)',
    default: true
  },
  nasdaq: {
    name: 'NASDAQ',
    cachePrefix: 'nasdaq',
    tickersUrl: 'https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt',
    getTickers: async function () {
      const url = this.tickersUrl;
      const response = await axios.get(url);
      const lines = response.data.split('\n');
      const tickers = [];
      const nameMap = {};
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('File Creation Time') || line.startsWith('Symbol|')) continue;
        const cols = line.split('|');
        if (cols.length < 2) continue;
        let symbol = cols[0].trim();
        let name = cols[1].trim();
        if (symbol && name && /^[A-Z.-]{1,6}$/.test(symbol) && !symbol.includes(' ') && symbol !== 'Symbol') {
          tickers.push(symbol);
          nameMap[symbol] = name;
        }
      }
      return { tickers, nameMap };
    },
    minMarketCap: 1_000_000_000,
    earningsSummary: 'NASDAQ stocks had earnings in the last 7 days.',
    upcomingTitle: 'Upcoming NASDAQ Earnings (Next 5 Days)',
    gainersTitle: 'Top 5 Positive Changes (Last Trading Day to Now)',
    losersTitle: 'Top 5 Drops (Last Trading Day to Now)',
    default: false
  }
}; 