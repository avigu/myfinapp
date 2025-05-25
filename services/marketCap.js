// services/marketCap.js
const yahooFinance = require('yahoo-finance2').default;
const { gcsRead, gcsWrite } = require('../gcs');

const MARKETCAP_CACHE_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const MARKETCAP_CACHE_FILE = 'marketcap-all.json';

// In-memory cache
let marketCapCache = {};

// Load cache from GCS on startup
(async () => {
  try {
    const capData = await gcsRead(MARKETCAP_CACHE_FILE);
    if (capData) marketCapCache = JSON.parse(capData);
    console.log(`[CACHE] Loaded market cap cache with ${Object.keys(marketCapCache).length} entries`);
  } catch (err) {
    console.log(`[CACHE] Could not load market cap cache: ${err.message}`);
  }
})();

async function saveMarketCapCache() {
  try {
    await gcsWrite(MARKETCAP_CACHE_FILE, JSON.stringify(marketCapCache));
  } catch (err) {
    console.log(`[CACHE] Error saving market cap cache: ${err.message}`);
  }
}

async function getMarketCap(ticker) {
  const now = Date.now();
  const entry = marketCapCache[ticker];
  
  if (entry && (now - entry.timestamp < MARKETCAP_CACHE_MS)) {
    return entry.value;
  }
  
  console.log(`[NETWORK] Fetching market cap for ${ticker}`);
  try {
    const quote = await yahooFinance.quoteSummary(ticker, { modules: ['price'] });
    const cap = quote.price.marketCap || null;
    
    marketCapCache[ticker] = { value: cap, timestamp: now };
    await saveMarketCapCache();
    
    return cap;
  } catch (err) {
    console.log(`${ticker}: Error fetching market cap from Yahoo: ${err.message}`);
    return null;
  }
}

module.exports = {
  getMarketCap,
}; 