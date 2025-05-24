// services/tickers.js
const { INDICES } = require('../config/indices');
const { readCache, writeCache } = require('../utils/cache');

const TICKERS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getTickersCached(indexKey) {
  const index = INDICES[indexKey];
  if (!index) {
    throw new Error(`Unknown index: ${indexKey}`);
  }
  
  const cacheName = `${index.cachePrefix}-tickers`;
  const cache = await readCache(cacheName, TICKERS_CACHE_MS);
  
  if (cache) {
    return [cache.tickers, cache.nameMap];
  }
  
  console.log(`[NETWORK] Fetching ${indexKey} tickers from network`);
  const { tickers, nameMap } = await index.getTickers();
  await writeCache(cacheName, { tickers, nameMap });
  
  return [tickers, nameMap];
}

module.exports = {
  getTickersCached,
}; 