// services/marketCap.js
const fmp = require('../config/fmpConfig');
const { readCache, writeCache } = require('../utils/cache');

const MARKETCAP_CACHE_MS = 24 * 60 * 60 * 1000; // 1 day

// In-memory cache for market cap data
let marketCapCache = {};

// Load market cap cache on startup
async function loadMarketCapCache() {
  try {
    const cache = await readCache('market-cap-cache', MARKETCAP_CACHE_MS);
    if (cache) {
      marketCapCache = cache;
    }
  } catch (err) {
    console.error(`[ERROR] Could not load market cap cache: ${err.message}`);
  }
}

// Save market cap cache
async function saveMarketCapCache() {
  try {
    await writeCache('market-cap-cache', marketCapCache);
  } catch (err) {
    console.error(`[ERROR] Error saving market cap cache: ${err.message}`);
  }
}

async function getMarketCap(ticker) {
  const now = Date.now();
  const entry = marketCapCache[ticker];
  
  if (entry && (now - entry.timestamp < MARKETCAP_CACHE_MS)) {
    return entry.value;
  }
  
  try {
    const quote = await fmp.quote(ticker);
    const cap = quote ? quote.marketCap || null : null;

    marketCapCache[ticker] = { value: cap, timestamp: now };
    await saveMarketCapCache();

    return cap;
  } catch (err) {
    console.error(`[ERROR] ${ticker}: Error fetching market cap from FMP: ${err.message}`);
    return null;
  }
}

// Initialize cache on module load
loadMarketCapCache();

module.exports = { getMarketCap }; 