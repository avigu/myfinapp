// services/earnings.js
const axios = require('axios');
const { readCache, writeCache } = require('../utils/cache');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd0gfql9r01qhao4tdc6gd0gfql9r01qhao4tdc70';
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
  
  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
  
  try {
    const response = await axios.get(url);
    const data = response.data;
    
    // Store in both persistent and memory cache
    await writeCache(cacheKey, data);
    earningsMemoryCache[cacheKey] = {
      data: data,
      timestamp: Date.now()
    };
    
    return data;
  } catch (error) {
    console.error('[ERROR] Error fetching Finnhub earnings calendar:', error.message);
    return { earningsCalendar: [] }; // Return a default structure in case of error
  }
}

module.exports = { getRecentEarningsCalendar }; 