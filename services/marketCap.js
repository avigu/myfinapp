// services/marketCap.js
// This module is kept for backward compatibility but now delegates to stockDataProvider
const stockDataProvider = require('./stockDataProvider');
const { createLogger } = require('../utils/logger');

const log = createLogger('MARKETCAP');

/**
 * Get market cap for a ticker
 * This is a legacy wrapper that delegates to stockDataProvider
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<number|null>} - Market cap or null
 */
async function getMarketCap(ticker) {
  log.debug('getMarketCap called', { ticker });
  return stockDataProvider.getMarketCap(ticker);
}

/**
 * Get market caps for multiple tickers in batch
 * @param {string[]} tickers - Array of ticker symbols
 * @returns {Promise<Object>} - Map of ticker -> market cap
 */
async function getBatchMarketCaps(tickers) {
  log.debug('getBatchMarketCaps called', { count: tickers.length });
  const quotes = await stockDataProvider.getBatchQuotes(tickers);
  const result = {};
  for (const ticker of tickers) {
    result[ticker] = quotes[ticker]?.marketCap || null;
  }
  return result;
}

module.exports = { getMarketCap, getBatchMarketCaps };
