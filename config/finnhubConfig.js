const axios = require('axios');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd0gfql9r01qhao4tdc6gd0gfql9r01qhao4tdc70';
const BASE_URL = 'https://finnhub.io/api/v1';

/**
 * Fetches data from Finnhub API
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - API response data
 */
async function fetchFinnhub(endpoint, params = {}) {
  const url = `${BASE_URL}${endpoint}?${new URLSearchParams({
    ...params,
    token: FINNHUB_API_KEY
  })}`;
  
  try {
    const response = await axios.get(url, { timeout: 15000 });
    return response.data;
  } catch (error) {
    console.error(`[FINNHUB] Error fetching data from ${endpoint}: ${error.message}`);
    throw error;
  }
}

/**
 * Gets real-time quote data for a ticker
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object|null>} - Quote data or null if unavailable
 */
async function getQuote(ticker) {
  try {
    const data = await fetchFinnhub('/quote', { symbol: ticker });
    
    if (!data || data.c === undefined) {
      return null;
    }
    
    return {
      price: data.c, // Current price
      change: data.d, // Change
      percentChange: data.dp, // Percent change
      high: data.h, // High price of the day
      low: data.l, // Low price of the day
      open: data.o, // Open price of the day
      previousClose: data.pc, // Previous close price
    };
  } catch (error) {
    console.error(`[FINNHUB] Error getting quote for ${ticker}: ${error.message}`);
    return null;
  }
}

/**
 * Gets earnings calendar data for a date range
 * @param {string} fromDate - Start date in YYYY-MM-DD format
 * @param {string} toDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Earnings calendar data
 */
async function getEarningsCalendar(fromDate, toDate) {
  try {
    const data = await fetchFinnhub('/calendar/earnings', { 
      from: fromDate,
      to: toDate
    });
    
    return data;
  } catch (error) {
    console.error(`[FINNHUB] Error getting earnings calendar: ${error.message}`);
    return { earningsCalendar: [] };
  }
}

/**
 * Gets insider transactions for a ticker
 * @param {string} ticker - Stock ticker symbol
 * @param {string} fromDate - Start date in YYYY-MM-DD format
 * @param {string} toDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Insider transactions data
 */
async function getInsiderTransactions(ticker, fromDate, toDate) {
  try {
    const data = await fetchFinnhub('/stock/insider-transactions', {
      symbol: ticker,
      from: fromDate,
      to: toDate
    });
    
    return data;
  } catch (error) {
    console.error(`[FINNHUB] Error getting insider transactions for ${ticker}: ${error.message}`);
    return { data: [] };
  }
}

/**
 * Gets company profile data
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object|null>} - Company profile data or null if unavailable
 */
async function getCompanyProfile(ticker) {
  try {
    const data = await fetchFinnhub('/stock/profile2', { symbol: ticker });
    
    if (!data || !data.name) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`[FINNHUB] Error getting company profile for ${ticker}: ${error.message}`);
    return null;
  }
}

module.exports = {
  fetchFinnhub,
  getQuote,
  getEarningsCalendar,
  getInsiderTransactions,
  getCompanyProfile
}; 