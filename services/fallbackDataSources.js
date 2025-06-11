// Fallback data sources for when Yahoo Finance fails
const axios = require('axios');

// Alternative data sources
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd0gfql9r01qhao4tdc6gd0gfql9r01qhao4tdc70';

// Fallback to Alpha Vantage for market cap and price
async function getMarketCapFallback(ticker) {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.log(`[WARN] No Alpha Vantage API key available for fallback`);
    return null;
  }
  
  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data.MarketCapitalization) {
      const marketCap = parseInt(response.data.MarketCapitalization);
      console.log(`[INFO] Alpha Vantage fallback success for ${ticker}: Market Cap ${marketCap}`);
      return marketCap;
    }
    
    return null;
  } catch (error) {
    console.error(`[ERROR] Alpha Vantage fallback failed for ${ticker}:`, error.message);
    return null;
  }
}

// Fallback to Finnhub for current price
async function getCurrentPriceFallback(ticker) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data.c) {
      const currentPrice = response.data.c;
      console.log(`[INFO] Finnhub fallback success for ${ticker}: Price $${currentPrice}`);
      return currentPrice;
    }
    
    return null;
  } catch (error) {
    console.error(`[ERROR] Finnhub fallback failed for ${ticker}:`, error.message);
    return null;
  }
}

// Combined fallback strategy
async function getStockDataFallback(ticker) {
  console.log(`[INFO] Attempting fallback data sources for ${ticker}`);
  
  const [marketCap, currentPrice] = await Promise.allSettled([
    getMarketCapFallback(ticker),
    getCurrentPriceFallback(ticker)
  ]);
  
  return {
    marketCap: marketCap.status === 'fulfilled' ? marketCap.value : null,
    currentPrice: currentPrice.status === 'fulfilled' ? currentPrice.value : null,
    source: 'fallback'
  };
}

module.exports = {
  getMarketCapFallback,
  getCurrentPriceFallback,
  getStockDataFallback
}; 