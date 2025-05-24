const { getTickersCached } = require('./tickers');
const { getMarketCap } = require('./marketCap');
const { getHistoricalPrices } = require('./historical');
const { getRecentEarningsCalendar } = require('./earnings');
const { INDICES } = require('../config/indices');
const yahooFinance = require('yahoo-finance2').default;

// Main investment opportunities logic
async function getInvestmentOpportunities(indexKey, now = new Date()) {
  const index = INDICES[indexKey];
  let tTickers0 = Date.now();
  let tickerCalls = 0;
  let tTickers1, tEarnings0, tEarnings1, tHistTotal = 0, tPriceTotal = 0;
  let earningsCalls = 0;
  let historyCalls = 0;
  let currentPriceCalls = 0;

  // Per-request in-memory cache for historical files
  const historicalCacheFiles = {};

  // Fetch earnings
  tEarnings0 = Date.now();
  const fromDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate = now.toISOString().slice(0, 10);
  const earningsCalendarData = await getRecentEarningsCalendar(fromDate, toDate); earningsCalls++;
  tEarnings1 = Date.now();

  // Fetch tickers
  tTickers1 = Date.now();
  const tTickersStart = Date.now();
  let [tickers, nameMap] = await getTickersCached(indexKey); tickerCalls++;
  const tTickersEnd = Date.now();
  const tickerSet = new Set(tickers);
  const earningsArray = earningsCalendarData.earningsCalendar || [];
  const relevantEarnings = earningsArray.filter(e => e && e.symbol && tickerSet.has(e.symbol));
  
  const results = [];
  for (const earning of relevantEarnings) {
    const ticker = earning.symbol;
    if (!ticker || ticker === 'SP500' || !/^[A-Z.-]{1,6}$/.test(ticker)) continue;
    const earningsDate = new Date(earning.date);
    if (isNaN(earningsDate.getTime())) {
      console.log(`[WARN] Skipping ${ticker}: invalid earnings date "${earning.date}"`);
      continue;
    }
    const earningsUnix = Math.floor(earningsDate.getTime() / 1000);
    if (!Number.isFinite(earningsUnix)) {
      console.log(`[WARN] Skipping ${ticker}: invalid earningsUnix "${earningsUnix}"`);
      continue;
    }
    try {
      const tHist0 = Date.now();
      const marketCap = await getMarketCap(ticker);
      if (!marketCap || marketCap < index.minMarketCap) continue;
      const daysBack = 7;
      const fromUnixForHistory = earningsUnix - daysBack * 86400;
      const toUnixForHistory = earningsUnix;
      if (!Number.isFinite(fromUnixForHistory) || !Number.isFinite(toUnixForHistory)) {
        console.log(`[WARN] Skipping ${ticker}: invalid from/to unix (${fromUnixForHistory}, ${toUnixForHistory})`);
        continue;
      }
      // Pass the per-request cache
      const history = await getHistoricalPrices(indexKey, ticker, fromUnixForHistory, toUnixForHistory, historicalCacheFiles); historyCalls++;
      const tHist1 = Date.now();
      tHistTotal += (tHist1 - tHist0);
      if (!history || !history.c || history.c.length < 1) continue;
      let priceBeforeEarnings = null;
      for (let i = history.t.length - 1; i >= 0; i--) {
        if (history.t[i] < earningsUnix) {
          priceBeforeEarnings = history.c[i];
          break;
        }
      }
      if (priceBeforeEarnings === null) {
        console.log(`[WARN] No trading day before earnings for ${ticker} (${earning.date})`);
        continue;
      }
      const tPrice0 = Date.now();
      const liveQuote = await yahooFinance.quoteSummary(ticker, { modules: ['price'] }); currentPriceCalls++;
      const tPrice1 = Date.now();
      tPriceTotal += (tPrice1 - tPrice0);
      const priceNow = liveQuote.price.regularMarketPrice;
      if (!priceNow) continue;
      const change = ((priceNow - priceBeforeEarnings) / priceBeforeEarnings) * 100;
      results.push({
        ticker,
        name: nameMap[ticker] || '',
        earningsDate: earning.date,
        marketCap,
        priceBeforeEarnings,
        priceNow,
        change
      });
    } catch (err) {
      console.log(`${ticker}: Error processing in main logic: ${err.message}`);
    }
  }
  // Log timings and network calls
  console.log(`[MEASURE] Time to fetch earnings: ${tEarnings1 - tEarnings0}ms, network calls: ${earningsCalls}`);
  console.log(`[MEASURE] Time to fetch tickers: ${tTickersEnd - tTickersStart}ms, network calls: ${tickerCalls}`);
  console.log(`[MEASURE] Time to fetch historical prices: ${tHistTotal}ms, network calls: ${historyCalls}`);
  console.log(`[MEASURE] Time to fetch current prices: ${tPriceTotal}ms, network calls: ${currentPriceCalls}`);
  return results.sort((a, b) => b.change - a.change);
}

// Upcoming relevant earnings logic
async function getUpcomingRelevantEarnings(indexKey) {
  const index = INDICES[indexKey];
  const now = new Date();
  const fromDate = now.toISOString().slice(0, 10);
  const toDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const earningsCalendarData = await getRecentEarningsCalendar(fromDate, toDate);
  const [tickers, nameMap] = await getTickersCached(indexKey);
  const tickerSet = new Set(tickers);
  const earningsArray = earningsCalendarData.earningsCalendar || [];
  const relevant = [];
  for (const earning of earningsArray) {
    if (!earning || !earning.symbol || !tickerSet.has(earning.symbol)) continue;
    try {
      const marketCap = await getMarketCap(earning.symbol);
      if (!marketCap || marketCap < index.minMarketCap) continue;
      relevant.push({
        ticker: earning.symbol,
        name: nameMap[earning.symbol] || '',
        date: earning.date,
        marketCap
      });
    } catch (err) {
      console.log(`Error processing upcoming earnings for ${earning.symbol}: ${err.message}`);
    }
  }
  return relevant.sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = {
  getInvestmentOpportunities,
  getUpcomingRelevantEarnings,
}; 