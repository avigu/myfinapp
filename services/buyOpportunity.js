const { getInsiderTransactions } = require('./insiderTrading');
const { getValuationAnalysis, getValuationAnalysisAlphaVantage } = require('./valuation');
const { getAnalystSentiment, getAnalystSentimentSimplified } = require('./analystSentiment');

async function analyzeBuyOpportunity(stock) {
  // Only analyze stocks that dropped more than 7%
  if (stock.change >= -7) {
    console.log(`[BUY_OPPORTUNITY] Skipping ${stock.ticker}: only dropped ${stock.change.toFixed(2)}% (need >7% drop)`);
    return null;
  }
  
  console.log(`[BUY_OPPORTUNITY] 🔍 Analyzing buy opportunity for ${stock.ticker} (${stock.change.toFixed(2)}% drop)`);
  console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - Price: $${stock.priceBeforeEarnings} → $${stock.priceNow} | Market Cap: $${(stock.marketCap / 1e9).toFixed(1)}B`);
  
  try {
    console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - Fetching analysis data (insider, valuation, analyst)...`);
    
    // Fetch all data in parallel for better performance
    const [insiderData, valuationData, analystData] = await Promise.all([
      getInsiderTransactions(stock.ticker).then(data => {
        console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - Insider data: ${data.signal} (Buys: $${(data.buyValue / 1e6).toFixed(1)}M, Sells: $${(data.sellValue / 1e6).toFixed(1)}M)`);
        return data;
      }).catch(err => {
        console.error(`[BUY_OPPORTUNITY] ${stock.ticker} - Insider data failed: ${err.message}`);
        return { signal: '⚪', buyValue: 0, sellValue: 0, totalBuys: 0, totalSells: 0 };
      }),
      
      getValuationAnalysis(stock.ticker).catch(() => {
        console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - Primary valuation failed, trying AlphaVantage...`);
        return getValuationAnalysisAlphaVantage(stock.ticker);
      }).then(data => {
        console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - Valuation: P/E ${data.companyPE} vs Industry ${data.industryPE} | ${data.isUndervalued ? 'UNDERVALUED' : 'NOT UNDERVALUED'}`);
        return data;
      }).catch(err => {
        console.error(`[BUY_OPPORTUNITY] ${stock.ticker} - Valuation analysis failed: ${err.message}`);
        return { companyPE: null, industryPE: null, isUndervalued: false, sector: 'Unknown' };
      }),
      
      getAnalystSentiment(stock.ticker).catch(() => {
        console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - Primary analyst sentiment failed, trying simplified...`);
        return getAnalystSentimentSimplified(stock.ticker);
      }).then(data => {
        console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - Analyst sentiment: ${data.sentiment} | Upside: ${data.upsidePotential || 'N/A'}% | ${data.isPositive ? 'POSITIVE' : 'NEGATIVE'}`);
        return data;
      }).catch(err => {
        console.error(`[BUY_OPPORTUNITY] ${stock.ticker} - Analyst sentiment failed: ${err.message}`);
        return { sentiment: '⚪', isPositive: false, ratings: { buy: 0, hold: 0, sell: 0 }, upsidePotential: null };
      })
    ]);
    
    // Determine if this is a buy opportunity based on criteria
    const criteria = {
      droppedOver7Percent: stock.change < -7,
      insiderBuying: insiderData.signal === '🟢',
      undervalued: valuationData.isUndervalued,
      positiveAnalystSentiment: analystData.isPositive
    };
    
    // Count how many criteria are met
    const criteriaMetCount = Object.values(criteria).filter(Boolean).length;
    const isBuyOpportunity = criteriaMetCount >= 3; // At least 3 out of 4 criteria
    
    console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - Criteria analysis:`);
    console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - ✓ Dropped >7%: ${criteria.droppedOver7Percent}`);
    console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - ✓ Insider buying: ${criteria.insiderBuying} (${insiderData.signal})`);
    console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - ✓ Undervalued: ${criteria.undervalued}`);
    console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - ✓ Positive sentiment: ${criteria.positiveAnalystSentiment} (${analystData.sentiment})`);
    console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - Criteria met: ${criteriaMetCount}/4`);
    
    // Generate recommendation
    let recommendation = 'Hold';
    let recommendationColor = '🟡';
    
    if (isBuyOpportunity) {
      recommendation = 'Strong Buy';
      recommendationColor = '🟢';
    } else if (criteriaMetCount >= 2) {
      recommendation = 'Moderate Buy';
      recommendationColor = '🟡';
    } else {
      recommendation = 'Avoid';
      recommendationColor = '🔴';
    }
    
    console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - 📊 FINAL RECOMMENDATION: ${recommendationColor} ${recommendation}`);
    
    const result = {
      ticker: stock.ticker,
      originalStock: stock,
      insiderData,
      valuationData,
      analystData,
      criteria,
      criteriaMetCount,
      isBuyOpportunity,
      recommendation,
      recommendationColor,
      analysisDate: new Date().toISOString()
    };
    
    console.log(`[BUY_OPPORTUNITY] ${stock.ticker} - ✅ Analysis completed successfully`);
    return result;
    
  } catch (error) {
    console.error(`[BUY_OPPORTUNITY] ${stock.ticker} - ❌ Critical error during analysis: ${error.message}`);
    console.error(`[BUY_OPPORTUNITY] ${stock.ticker} - Error stack: ${error.stack}`);
    return null;
  }
}

async function analyzeBuyOpportunities(stocks) {
  // Filter stocks that dropped more than 7%
  const droppedStocks = stocks.filter(stock => stock.change < -7);
  
  if (droppedStocks.length === 0) {
    return [];
  }
  
  // Analyze each stock (limit to prevent API rate limiting)
  const stocksToAnalyze = droppedStocks.slice(0, 10); // Limit to 10 stocks
  const opportunities = [];
  const startTime = Date.now();
  
  for (let i = 0; i < stocksToAnalyze.length; i++) {
    const stock = stocksToAnalyze[i];
    
    const analysis = await analyzeBuyOpportunity(stock);
    if (analysis) {
      opportunities.push(analysis);
    }
    
    // Add small delay to prevent API rate limiting
    if (i < stocksToAnalyze.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;
  
  // Sort by criteria met count (best opportunities first)
  const sortedOpportunities = opportunities.sort((a, b) => b.criteriaMetCount - a.criteriaMetCount);
  
  console.log(`[SUMMARY] Buy analysis: ${stocksToAnalyze.length} stocks analyzed, ${sortedOpportunities.length} opportunities found in ${totalTime.toFixed(1)}s`);
  
  return sortedOpportunities;
}

function generateBuyOpportunityReport(opportunity) {
  const { ticker, originalStock, insiderData, valuationData, analystData, criteria, recommendation } = opportunity;
  
  let report = `\n📊 BUY OPPORTUNITY ANALYSIS: ${ticker}\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `💰 Price Drop: ${originalStock.change.toFixed(2)}% (${originalStock.priceBeforeEarnings} → ${originalStock.priceNow})\n`;
  report += `📅 Earnings Date: ${originalStock.earningsDate}\n\n`;
  
  report += `🔍 ANALYSIS CRITERIA:\n`;
  report += `${criteria.droppedOver7Percent ? '✅' : '❌'} Dropped >7% after earnings\n`;
  report += `${criteria.insiderBuying ? '✅' : '❌'} Insider buying activity ${insiderData.signal}\n`;
  report += `${criteria.undervalued ? '✅' : '❌'} Undervalued vs industry (P/E: ${valuationData.companyPE} vs ${valuationData.industryPE})\n`;
  report += `${criteria.positiveAnalystSentiment ? '✅' : '❌'} Positive analyst sentiment ${analystData.sentiment}\n\n`;
  
  report += `📈 RECOMMENDATION: ${recommendation}\n`;
  
  if (analystData.upsidePotential) {
    report += `🎯 Price Target Upside: ${analystData.upsidePotential > 0 ? '+' : ''}${analystData.upsidePotential}%\n`;
  }
  
  return report;
}

module.exports = {
  analyzeBuyOpportunity,
  analyzeBuyOpportunities,
  generateBuyOpportunityReport
}; 