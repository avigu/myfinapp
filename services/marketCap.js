// services/marketCap.js
const yahooFinance = require('../config/yahooFinanceConfig');
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
  
  // Retry logic for rate limiting issues
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      // Add delay for retries to avoid rate limiting
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
      
      const quote = await yahooFinance.quoteSummary(ticker, { modules: ['price'] });
      const cap = quote.price.marketCap || null;
      
      marketCapCache[ticker] = { value: cap, timestamp: now };
      await saveMarketCapCache();
      
      return cap;
    } catch (err) {
      // Check for redirect errors (rate limiting)
      if (err.message.includes('Unexpected redirect') || err.message.includes('guccounter')) {
        console.warn(`[WARN] ${ticker}: Yahoo Finance redirect detected (attempt ${retryCount + 1}/${maxRetries + 1}): ${err.message}`);
        retryCount++;
        if (retryCount <= maxRetries) {
          continue;
        }
      }
      
      console.error(`[ERROR] ${ticker}: Error fetching market cap from Yahoo: ${err.message}`);
      return null;
    }
  }
  
  return null;
}

// Initialize cache on module load
loadMarketCapCache();

module.exports = { getMarketCap }; 