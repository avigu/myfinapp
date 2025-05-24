// services/earnings.js
const axios = require('axios');
const { readCache, writeCache } = require('../utils/cache');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd0gfql9r01qhao4tdc6gd0gfql9r01qhao4tdc70';
const EARNINGS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getRecentEarningsCalendar(from, to) {
  const cacheKey = `earnings-${from}-${to}`;
  const cache = await readCache(cacheKey, EARNINGS_CACHE_MS);
  
  if (cache) {
    return cache;
  }
  
  console.log(`[NETWORK] Fetching earnings calendar for ${from} to ${to}`);
  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
  
  try {
    const response = await axios.get(url);
    await writeCache(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching Finnhub earnings calendar:', error.message);
    return { earningsCalendar: [] }; // Return a default structure in case of error
  }
}

module.exports = {
  getRecentEarningsCalendar,
}; 