// services/earnings.js
const dataProvider = require('../config/dataProvider');
const { readCache, writeCache } = require('../utils/cache');

const EARNINGS_CACHE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// In-memory cache to avoid repeated storage calls within the same request/session
let earningsMemoryCache = {};

async function getRecentEarningsCalendar(from, to) {
  const cacheKey = `earnings-${from}-${to}`;
  
  // Check in-memory cache first
  const memoryEntry = earningsMemoryCache[cacheKey];
  if (memoryEntry && (Date.now() - memoryEntry.timestamp < EARNINGS_CACHE_MS)) {
    return memoryEntry.data;
  }
  
  // Check persistent cache
  const cache = await readCache(cacheKey, EARNINGS_CACHE_MS);
  
  if (cache) {
    // Store in memory for future requests
    earningsMemoryCache[cacheKey] = {
      data: cache,
      timestamp: Date.now()
    };
    return cache;
  }
  
  try {
    // Use the unified data provider to get earnings calendar
    const data = await dataProvider.getEarningsCalendar(from, to);
    
    // Store in both persistent and memory cache
    await writeCache(cacheKey, data);
    earningsMemoryCache[cacheKey] = {
      data: data,
      timestamp: Date.now()
    };
    
    return data;
  } catch (error) {
    console.error('[ERROR] Error fetching earnings calendar:', error.message);
    return { earningsCalendar: [] }; // Return a default structure in case of error
  }
}

module.exports = { getRecentEarningsCalendar }; 