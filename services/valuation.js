const dataProvider = require('../config/dataProvider');
const alphaVantage = require('../config/alphaVantageConfig');

// You'll need to get a free API key from https://financialmodelingprep.com/
const FMP_API_KEY = process.env.FMP_API_KEY || 'demo'; // Replace with actual key

async function getValuationAnalysis(ticker) {
  console.log(`[VALUATION] 🔍 Starting valuation analysis for ${ticker}...`);
  
  try {
    // Get company overview from Alpha Vantage
    console.log(`[VALUATION] ${ticker} - Fetching company overview...`);
    const overview = await alphaVantage.getCompanyOverview(ticker);
    
    if (!overview || !overview.Symbol) {
      console.log(`[VALUATION] ${ticker} - No company overview data found`);
      return { companyPE: null, industryPE: null, isUndervalued: false, sector: null };
    }
    
    const companyPE = parseFloat(overview.PERatio);
    const sector = overview.Sector;
    console.log(`[VALUATION] ${ticker} - Company P/E: ${companyPE}, Sector: ${sector}`);
    
    if (!companyPE || companyPE <= 0) {
      console.log(`[VALUATION] ${ticker} - Invalid company P/E ratio`);
      return { companyPE: null, industryPE: null, isUndervalued: false, sector };
    }
    
    // Get current quote data
    console.log(`[VALUATION] ${ticker} - Fetching current quote...`);
    const quote = await dataProvider.quote(ticker);
    const currentPrice = quote ? quote.price : null;
    const marketCap = quote ? quote.marketCap : null;
    
    console.log(`[VALUATION] ${ticker} - Current price: $${currentPrice}, Market cap: $${marketCap}`);
    
    // Use sector average P/E ratios since Alpha Vantage doesn't provide industry averages
    console.log(`[VALUATION] ${ticker} - Using sector average P/E ratios...`);
    const sectorAverages = {
      'Technology': 25,
      'Healthcare': 20,
      'Financial Services': 12,
      'Consumer Cyclical': 18,
      'Communication Services': 22,
      'Industrials': 16,
      'Consumer Defensive': 15,
      'Energy': 14,
      'Utilities': 18,
      'Real Estate': 20,
      'Materials': 15,
      'Basic Materials': 15,
      'Consumer Goods': 17,
      'Services': 19,
      'Finance': 12,
      'Information Technology': 25,
      'Health Care': 20,
      'Consumer Staples': 15,
      'Consumer Discretionary': 18
    };
    
    const industryPE = sectorAverages[sector] || 18; // Default average
    console.log(`[VALUATION] ${ticker} - Using industry P/E: ${industryPE} for sector: ${sector}`);
    
    // Company is undervalued if its P/E is at least 20% lower than industry average
    const isUndervalued = companyPE < (industryPE * 0.8);
    console.log(`[VALUATION] ${ticker} - Undervalued check: ${companyPE} < ${(industryPE * 0.8).toFixed(2)} = ${isUndervalued}`);
    
    const result = {
      companyPE: Math.round(companyPE * 100) / 100,
      industryPE,
      isUndervalued,
      sector,
      industry: overview.Industry || sector,
      currentPrice,
      marketCap
    };
    
    console.log(`[VALUATION] ${ticker} - ✅ Analysis complete:`, result);
    return result;
    
  } catch (error) {
    console.error(`[VALUATION] ${ticker} - ❌ Error fetching valuation analysis: ${error.message}`);
    return { companyPE: null, industryPE: null, isUndervalued: false, sector: null };
  }
}

// Fallback using Alpha Vantage if FMP doesn't work
async function getValuationAnalysisAlphaVantage(ticker) {
  console.log(`[VALUATION] 🔄 Using Alpha Vantage fallback for ${ticker}...`);
  
  try {
    const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    console.log(`[VALUATION] ${ticker} - Fetching from Alpha Vantage...`);
    
    const response = await axios.get(url);
    
    if (!response.data || response.data.Note) {
      console.log(`[VALUATION] ${ticker} - Alpha Vantage API limit or no data`);
      return { companyPE: null, industryPE: null, isUndervalued: false, sector: null };
    }
    
    const data = response.data;
    const companyPE = parseFloat(data.PERatio);
    const sector = data.Sector;
    
    console.log(`[VALUATION] ${ticker} - Alpha Vantage data: P/E=${companyPE}, Sector=${sector}`);
    
    if (!companyPE || companyPE <= 0) {
      console.log(`[VALUATION] ${ticker} - Invalid P/E from Alpha Vantage`);
      return { companyPE: null, industryPE: null, isUndervalued: false, sector };
    }
    
    // For Alpha Vantage, we'll use a comprehensive sector average estimation
    const sectorAverages = {
      'Technology': 25,
      'Healthcare': 20,
      'Financial Services': 12,
      'Consumer Cyclical': 18,
      'Communication Services': 22,
      'Industrials': 16,
      'Consumer Defensive': 15,
      'Energy': 14,
      'Utilities': 18,
      'Real Estate': 20,
      'Materials': 15,
      'Basic Materials': 15,
      'Consumer Goods': 17,
      'Services': 19,
      'Finance': 12,
      'Information Technology': 25,
      'Health Care': 20,
      'Consumer Staples': 15,
      'Consumer Discretionary': 18
    };
    
    const industryPE = sectorAverages[sector] || 18; // Default average
    const isUndervalued = companyPE < (industryPE * 0.8);
    
    console.log(`[VALUATION] ${ticker} - Using sector average: ${industryPE} for ${sector}`);
    console.log(`[VALUATION] ${ticker} - Undervalued: ${companyPE} < ${(industryPE * 0.8).toFixed(2)} = ${isUndervalued}`);
    
    const result = {
      companyPE: Math.round(companyPE * 100) / 100,
      industryPE,
      isUndervalued,
      sector
    };
    
    console.log(`[VALUATION] ${ticker} - ✅ Alpha Vantage analysis complete:`, result);
    return result;
    
  } catch (error) {
    console.error(`[VALUATION] ${ticker} - ❌ Alpha Vantage fallback failed: ${error.message}`);
    return { companyPE: null, industryPE: null, isUndervalued: false, sector: null };
  }
}

module.exports = {
  getValuationAnalysis,
  getValuationAnalysisAlphaVantage
}; 