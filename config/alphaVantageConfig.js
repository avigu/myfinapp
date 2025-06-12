const axios = require('axios');

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Fetches data from Alpha Vantage API
 * @param {Object} params - Query parameters for the API
 * @returns {Promise<Object>} - The API response data
 */
async function fetchAlphaVantage(params) {
  const url = `${BASE_URL}?${new URLSearchParams({
    ...params,
    apikey: ALPHA_VANTAGE_API_KEY
  })}`;
  
  try {
    const response = await axios.get(url, { timeout: 30000 });
    
    // Check for API limit messages
    if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
      console.error(`[ALPHA-VANTAGE] API call frequency limit reached: ${response.data.Note}`);
      throw new Error('Alpha Vantage API call frequency limit reached');
    }
    
    return response.data;
  } catch (error) {
    console.error(`[ALPHA-VANTAGE] Error fetching data: ${error.message}`);
    throw error;
  }
}

/**
 * Gets company overview including market cap and shares outstanding
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} - Company overview data
 */
async function getCompanyOverview(ticker) {
  const data = await fetchAlphaVantage({
    function: 'OVERVIEW',
    symbol: ticker
  });
  
  return data;
}

/**
 * Gets current quote data for a ticker
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} - Quote data
 */
async function getQuote(ticker) {
  const data = await fetchAlphaVantage({
    function: 'GLOBAL_QUOTE',
    symbol: ticker
  });
  
  if (!data || !data['Global Quote'] || !data['Global Quote']['05. price']) {
    return null;
  }
  
  return {
    price: parseFloat(data['Global Quote']['05. price']),
    change: parseFloat(data['Global Quote']['09. change']),
    changePercent: parseFloat(data['Global Quote']['10. change percent'].replace('%', '')),
    volume: parseInt(data['Global Quote']['06. volume']),
    latestTradingDay: data['Global Quote']['07. latest trading day']
  };
}

/**
 * Gets historical daily price data
 * @param {string} ticker - Stock ticker symbol
 * @param {string} outputSize - 'compact' for last 100 data points, 'full' for up to 20 years
 * @returns {Promise<Array>} - Array of historical price data
 */
async function getHistoricalDaily(ticker, outputSize = 'compact') {
  const data = await fetchAlphaVantage({
    function: 'TIME_SERIES_DAILY',
    symbol: ticker,
    outputsize: outputSize
  });
  
  if (!data || !data['Time Series (Daily)']) {
    return [];
  }
  
  // Convert to array format similar to FMP for compatibility
  const timeSeries = data['Time Series (Daily)'];
  return Object.keys(timeSeries).map(date => ({
    date,
    close: parseFloat(timeSeries[date]['4. close']),
    open: parseFloat(timeSeries[date]['1. open']),
    high: parseFloat(timeSeries[date]['2. high']),
    low: parseFloat(timeSeries[date]['3. low']),
    volume: parseInt(timeSeries[date]['5. volume'])
  })).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
}

/**
 * Gets historical data between two dates
 * @param {string} ticker - Stock ticker symbol
 * @param {string} fromDate - Start date in YYYY-MM-DD format
 * @param {string} toDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} - Array of historical price data
 */
async function historical(ticker, fromDate, toDate) {
  // Alpha Vantage doesn't support date range filtering in the API directly
  // We need to fetch all data and filter it
  const outputSize = new Date(fromDate) < new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) ? 'full' : 'compact';
  const allData = await getHistoricalDaily(ticker, outputSize);
  
  // Filter data by date range
  const fromTimestamp = new Date(fromDate).getTime();
  const toTimestamp = new Date(toDate).getTime();
  
  return allData.filter(item => {
    const itemDate = new Date(item.date).getTime();
    return itemDate >= fromTimestamp && itemDate <= toTimestamp;
  });
}

/**
 * Calculate market cap using price and shares outstanding
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<number|null>} - Market cap value or null if unavailable
 */
async function getMarketCap(ticker) {
  try {
    const overview = await getCompanyOverview(ticker);
    
    if (overview && overview.MarketCapitalization) {
      return parseInt(overview.MarketCapitalization);
    }
    
    // If MarketCapitalization is not directly available, calculate it
    if (overview && overview.SharesOutstanding && overview.SharesOutstanding !== '0') {
      const quote = await getQuote(ticker);
      if (quote && quote.price) {
        const sharesOutstanding = parseInt(overview.SharesOutstanding);
        return Math.round(sharesOutstanding * quote.price);
      }
    }
    
    return null;
  } catch (error) {
    console.error(`[ALPHA-VANTAGE] Error calculating market cap for ${ticker}: ${error.message}`);
    return null;
  }
}

module.exports = {
  fetchAlphaVantage,
  getCompanyOverview,
  getQuote,
  getHistoricalDaily,
  historical,
  getMarketCap
}; 