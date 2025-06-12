const dataProvider = require('../config/dataProvider');
const alphaVantage = require('../config/alphaVantageConfig');

async function getAnalystSentiment(ticker) {
  try {
    // Alpha Vantage doesn't provide detailed analyst ratings
    // We'll use a simplified approach based on available data
    console.log(`[ANALYST] Getting analyst sentiment for ${ticker}...`);
    
    // Get company overview which includes some analyst data
    const overview = await alphaVantage.getCompanyOverview(ticker);
    
    // Get current price data
    const quote = await dataProvider.quote(ticker);
    const currentPrice = quote ? quote.price : null;
    
    let ratings = { buy: 0, hold: 0, sell: 0 };
    let averagePriceTarget = null;
    let sentiment = '🟡'; // Default to mixed
    
    if (overview) {
      // Extract analyst target price if available
      if (overview.AnalystTargetPrice) {
        averagePriceTarget = parseFloat(overview.AnalystTargetPrice);
        console.log(`[ANALYST] ${ticker} - Analyst target price: $${averagePriceTarget}`);
      }
      
      // Use recommendation trends if available (not directly available in Alpha Vantage)
      // We'll estimate based on price target vs current price
      if (averagePriceTarget && currentPrice) {
        const upside = ((averagePriceTarget - currentPrice) / currentPrice) * 100;
        console.log(`[ANALYST] ${ticker} - Estimated upside: ${upside.toFixed(2)}%`);
        
        // Estimate ratings based on upside potential
        if (upside > 15) {
          // Strong buy signal if upside is significant
          ratings.buy = 3;
          ratings.hold = 1;
          ratings.sell = 0;
          sentiment = '🟢';
        } else if (upside > 5) {
          // Moderate buy
          ratings.buy = 2;
          ratings.hold = 2;
          ratings.sell = 0;
          sentiment = '🟢';
        } else if (upside > -5) {
          // Hold
          ratings.buy = 1;
          ratings.hold = 3;
          ratings.sell = 0;
          sentiment = '🟡';
        } else {
          // Sell
          ratings.buy = 0;
          ratings.hold = 2;
          ratings.sell = 2;
          sentiment = '🔴';
        }
      }
    }
    
    // Calculate upside potential
    let upsidePotential = null;
    if (averagePriceTarget && currentPrice) {
      upsidePotential = ((averagePriceTarget - currentPrice) / currentPrice) * 100;
      upsidePotential = Math.round(upsidePotential * 100) / 100;
    }
    
    return {
      ratings,
      averagePriceTarget,
      currentPrice,
      upsidePotential,
      sentiment,
      isPositive: sentiment === '🟢' && (ratings.buy > (ratings.hold + ratings.sell))
    };
    
  } catch (error) {
    console.error(`[ANALYST] Error fetching analyst sentiment for ${ticker}:`, error.message);
    return {
      ratings: { buy: 0, hold: 0, sell: 0 },
      averagePriceTarget: null,
      currentPrice: null,
      upsidePotential: null,
      sentiment: '🟡',
      isPositive: false
    };
  }
}

// Fallback function using a simplified approach with alternative data
async function getAnalystSentimentSimplified(ticker) {
  try {
    // This is a simplified version that could scrape other sources
    // or use free APIs that provide analyst recommendations
    
    return {
      ratings: { buy: 0, hold: 0, sell: 0 },
      averagePriceTarget: null,
      currentPrice: null,
      upsidePotential: null,
      sentiment: '🟡',
      isPositive: false
    };
    
  } catch (error) {
    console.error(`Error fetching simplified analyst sentiment for ${ticker}:`, error.message);
    return {
      ratings: { buy: 0, hold: 0, sell: 0 },
      averagePriceTarget: null,
      currentPrice: null,
      upsidePotential: null,
      sentiment: '🟡',
      isPositive: false
    };
  }
}

module.exports = {
  getAnalystSentiment,
  getAnalystSentimentSimplified
}; 