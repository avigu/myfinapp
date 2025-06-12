/**
 * Unified data provider that combines Alpha Vantage and Finnhub
 * Alpha Vantage: Used for price data, indicators, fundamentals
 * Finnhub: Used for earnings calendar, insider trades, real-time quotes fallback
 */

const alphaVantage = require('./alphaVantageConfig');
const finnhub = require('./finnhubConfig');

/**
 * Gets stock quote data with price and basic info
 * Primary: Alpha Vantage, Fallback: Finnhub
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object|null>} - Quote data or null if unavailable
 */
async function quote(ticker) {
  try {
    console.log(`[DATA-PROVIDER] Getting quote for ${ticker} from Alpha Vantage`);
    const avQuote = await alphaVantage.getQuote(ticker);
    
    if (avQuote && avQuote.price) {
      // Get market cap from Alpha Vantage
      const marketCap = await alphaVantage.getMarketCap(ticker);
      
      return {
        price: avQuote.price,
        change: avQuote.change,
        changePercent: avQuote.changePercent,
        marketCap: marketCap,
        volume: avQuote.volume,
        latestTradingDay: avQuote.latestTradingDay,
        source: 'alpha-vantage'
      };
    }
    
    // Fallback to Finnhub if Alpha Vantage fails
    console.log(`[DATA-PROVIDER] Alpha Vantage quote failed for ${ticker}, trying Finnhub`);
    const fhQuote = await finnhub.getQuote(ticker);
    
    if (fhQuote && fhQuote.price) {
      // Try to get company profile from Finnhub for additional data
      const profile = await finnhub.getCompanyProfile(ticker);
      const marketCap = profile ? profile.marketCapitalization : null;
      
      return {
        price: fhQuote.price,
        change: fhQuote.change,
        changePercent: fhQuote.percentChange,
        marketCap: marketCap,
        previousClose: fhQuote.previousClose,
        source: 'finnhub'
      };
    }
    
    console.log(`[DATA-PROVIDER] No quote data available for ${ticker} from either provider`);
    return null;
  } catch (error) {
    console.error(`[DATA-PROVIDER] Error getting quote for ${ticker}: ${error.message}`);
    return null;
  }
}

/**
 * Gets historical price data between two dates
 * Primary: Alpha Vantage
 * @param {string} ticker - Stock ticker symbol
 * @param {string} fromDate - Start date in YYYY-MM-DD format
 * @param {string} toDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} - Array of historical price data
 */
async function historical(ticker, fromDate, toDate) {
  try {
    console.log(`[DATA-PROVIDER] Getting historical data for ${ticker} from Alpha Vantage (${fromDate} to ${toDate})`);
    const data = await alphaVantage.historical(ticker, fromDate, toDate);
    
    if (data && data.length > 0) {
      return data;
    }
    
    console.log(`[DATA-PROVIDER] No historical data available for ${ticker}`);
    return [];
  } catch (error) {
    console.error(`[DATA-PROVIDER] Error getting historical data for ${ticker}: ${error.message}`);
    return [];
  }
}

/**
 * Gets company profile with sector, industry, etc.
 * Primary: Alpha Vantage, Fallback: Finnhub
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object|null>} - Company profile data or null if unavailable
 */
async function profile(ticker) {
  try {
    console.log(`[DATA-PROVIDER] Getting company profile for ${ticker} from Alpha Vantage`);
    const overview = await alphaVantage.getCompanyOverview(ticker);
    
    if (overview && overview.Symbol) {
      return {
        symbol: overview.Symbol,
        name: overview.Name,
        description: overview.Description,
        sector: overview.Sector,
        industry: overview.Industry,
        exchange: overview.Exchange,
        marketCap: parseInt(overview.MarketCapitalization) || null,
        sharesOutstanding: parseInt(overview.SharesOutstanding) || null,
        source: 'alpha-vantage'
      };
    }
    
    // Fallback to Finnhub
    console.log(`[DATA-PROVIDER] Alpha Vantage profile failed for ${ticker}, trying Finnhub`);
    const fhProfile = await finnhub.getCompanyProfile(ticker);
    
    if (fhProfile && fhProfile.name) {
      return {
        symbol: fhProfile.ticker,
        name: fhProfile.name,
        description: fhProfile.finnhubIndustry,
        sector: fhProfile.finnhubIndustry,
        industry: fhProfile.finnhubIndustry,
        exchange: fhProfile.exchange,
        marketCap: fhProfile.marketCapitalization || null,
        sharesOutstanding: fhProfile.shareOutstanding || null,
        source: 'finnhub'
      };
    }
    
    console.log(`[DATA-PROVIDER] No profile data available for ${ticker} from either provider`);
    return null;
  } catch (error) {
    console.error(`[DATA-PROVIDER] Error getting company profile for ${ticker}: ${error.message}`);
    return null;
  }
}

/**
 * Gets market cap data - either directly or calculated from shares outstanding
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<number|null>} - Market cap value or null if unavailable
 */
async function getMarketCap(ticker) {
  try {
    console.log(`[DATA-PROVIDER] Getting market cap for ${ticker}`);
    const marketCap = await alphaVantage.getMarketCap(ticker);
    
    if (marketCap) {
      console.log(`[DATA-PROVIDER] Market cap for ${ticker}: ${marketCap}`);
      return marketCap;
    }
    
    // If Alpha Vantage fails, try getting profile from Finnhub which might include market cap
    console.log(`[DATA-PROVIDER] Alpha Vantage market cap failed for ${ticker}, trying Finnhub`);
    const profile = await finnhub.getCompanyProfile(ticker);
    
    if (profile && profile.marketCapitalization) {
      const fhMarketCap = profile.marketCapitalization;
      console.log(`[DATA-PROVIDER] Finnhub market cap for ${ticker}: ${fhMarketCap}`);
      return fhMarketCap;
    }
    
    console.log(`[DATA-PROVIDER] No market cap data available for ${ticker} from either provider`);
    return null;
  } catch (error) {
    console.error(`[DATA-PROVIDER] Error getting market cap for ${ticker}: ${error.message}`);
    return null;
  }
}

/**
 * Gets earnings calendar data
 * Provider: Finnhub only
 * @param {string} fromDate - Start date in YYYY-MM-DD format
 * @param {string} toDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Earnings calendar data
 */
async function getEarningsCalendar(fromDate, toDate) {
  try {
    console.log(`[DATA-PROVIDER] Getting earnings calendar from Finnhub (${fromDate} to ${toDate})`);
    return await finnhub.getEarningsCalendar(fromDate, toDate);
  } catch (error) {
    console.error(`[DATA-PROVIDER] Error getting earnings calendar: ${error.message}`);
    return { earningsCalendar: [] };
  }
}

/**
 * Gets insider transactions data
 * Provider: Finnhub only
 * @param {string} ticker - Stock ticker symbol
 * @param {string} fromDate - Start date in YYYY-MM-DD format
 * @param {string} toDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Insider transactions data
 */
async function getInsiderTransactions(ticker, fromDate, toDate) {
  try {
    console.log(`[DATA-PROVIDER] Getting insider transactions for ${ticker} from Finnhub`);
    return await finnhub.getInsiderTransactions(ticker, fromDate, toDate);
  } catch (error) {
    console.error(`[DATA-PROVIDER] Error getting insider transactions for ${ticker}: ${error.message}`);
    return { data: [] };
  }
}

module.exports = {
  quote,
  historical,
  profile,
  getMarketCap,
  getEarningsCalendar,
  getInsiderTransactions
}; 