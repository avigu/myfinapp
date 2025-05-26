// services/tickers.js
const { INDICES } = require('../config/indices');
const { readCache, writeCache } = require('../utils/cache');

const TICKERS_CACHE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// In-memory cache to avoid repeated storage calls within the same request/session
let tickersMemoryCache = {};

async function getTickersCached(indexKey) {
  const index = INDICES[indexKey];
  if (!index) {
    throw new Error(`Unknown index: ${indexKey}`);
  }
  
  const cacheName = `${index.cachePrefix}-tickers`;
  
  // Check in-memory cache first
  const memoryEntry = tickersMemoryCache[cacheName];
  if (memoryEntry && (Date.now() - memoryEntry.timestamp < TICKERS_CACHE_MS)) {
    return [memoryEntry.data.tickers, memoryEntry.data.nameMap];
  }
  
  // Check persistent cache
  const cache = await readCache(cacheName, TICKERS_CACHE_MS);
  
  if (cache) {
    // Store in memory for future requests
    tickersMemoryCache[cacheName] = {
      data: cache,
      timestamp: Date.now()
    };
    return [cache.tickers, cache.nameMap];
  }
  
  const { tickers, nameMap } = await index.getTickers();
  const data = { tickers, nameMap };
  
  // Store in both persistent and memory cache
  await writeCache(cacheName, data);
  tickersMemoryCache[cacheName] = {
    data: data,
    timestamp: Date.now()
  };
  
  return [tickers, nameMap];
}

module.exports = { getTickersCached }; 