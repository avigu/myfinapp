// services/historical.js
const yahooFinance = require('yahoo-finance2').default;
const { getCacheFilePath, loadCacheFile, saveCacheFile } = require('../utils/cache');

const HISTORICAL_CACHE_MS = 1 * 60 * 60 * 1000; // 1 hour

function getHistoricalCacheFile(indexKey) {
  return getCacheFilePath(`historical-all-${indexKey}`);
}

async function getHistoricalPrices(indexKey, ticker, from, to, historicalCacheFiles) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
    console.log(`[WARN] Skipping getHistoricalPrices for ${ticker}: invalid from/to (${from}, ${to})`);
    return { s: 'error', c: [], t: [] };
  }
  
  const file = getHistoricalCacheFile(indexKey);
  
  // Use per-request in-memory cache to avoid repeated file reads
  let cache;
  if (historicalCacheFiles[file]) {
    cache = historicalCacheFiles[file];
    console.log(`[CACHE] Using in-memory historical cache file for ${indexKey}`);
  } else {
    cache = await loadCacheFile(file);
    historicalCacheFiles[file] = cache;
    console.log(`[CACHE] Loaded historical cache file from storage for ${indexKey}`);
  }
  
  const now = Date.now();
  if (!cache[ticker]) cache[ticker] = {};
  
  const key = `${from}-${to}`;
  const entry = cache[ticker][key];
  
  if (entry && (now - entry.timestamp < HISTORICAL_CACHE_MS)) {
    console.log(`[CACHE] Using cached historical data for ${ticker} (${key})`);
    return entry.value;
  }
  
  console.log(`[NETWORK] Fetching historical prices for ${ticker} (${key})`);
  try {
    const fromDate = new Date(from * 1000).toISOString().slice(0, 10);
    const toDate = new Date(to * 1000).toISOString().slice(0, 10);
    
    const history = await yahooFinance.historical(ticker, { 
      period1: fromDate, 
      period2: toDate, 
      interval: '1d' 
    });
    
    const result = { 
      s: history.length > 1 ? 'ok' : 'no_data', 
      c: history.map(day => day.close), 
      t: history.map(day => Math.floor(new Date(day.date).getTime() / 1000)) 
    };
    
    cache[ticker][key] = { value: result, timestamp: now };
    await saveCacheFile(file, cache);
    
    return result;
  } catch (err) {
    console.log(`${ticker}: Error fetching historical prices from Yahoo: ${err.message}`);
    return { s: 'error', c: [], t: [] };
  }
}

module.exports = {
  getHistoricalPrices,
}; 