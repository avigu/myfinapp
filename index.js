require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const yahooFinance = require('./config/yahooFinanceConfig');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd0gfql9r01qhao4tdc6gd0gfql9r01qhao4tdc70';

async function getSP500Tickers() {
  console.log('Fetching S&P 500 tickers from Wikipedia...');
  const url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies';
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const tickers = [];
  $('table.wikitable tbody tr').each((i, elem) => {
    const symbol = $(elem).find('td').first().text().trim();
    // Only include valid ticker symbols (all caps, 1-6 chars, no spaces, not a date)
    if (
      symbol &&
      symbol !== 'Symbol' &&
      /^[A-Z.-]{1,6}$/.test(symbol) &&
      !symbol.includes(' ')
    ) {
      tickers.push(symbol.replace('.', '-'));
    }
  });
  // Ensure 'PINS' is included
  if (!tickers.includes('PINS')) {
    tickers.unshift('PINS');
  }
  // Randomize tickers order
  for (let i = tickers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tickers[i], tickers[j]] = [tickers[j], tickers[i]];
  }
  console.log(`Found ${tickers.length} S&P 500 tickers (including PINS).`);
  console.log('Tickers to be processed:', tickers.slice(0, 20));
  return tickers;
}

async function getMarketCap(ticker) {
  // Use Yahoo Finance for market cap
  try {
    const quote = await yahooFinance.quoteSummary(ticker, { modules: ['price'] });
    return quote.price.marketCap || null;
  } catch (err) {
    console.log(`${ticker}: Error fetching market cap from Yahoo Finance`, err.message);
    return null;
  }
}

async function getEarnings(ticker) {
  const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
  const response = await axios.get(url);
  return response.data; // Array of earnings objects
}

async function getHistoricalPrices(ticker, from, to) {
  // Use Yahoo Finance for historical prices
  try {
    // Convert UNIX timestamps (seconds) to YYYY-MM-DD
    const fromDate = new Date(from * 1000).toISOString().slice(0, 10);
    const toDate = new Date(to * 1000).toISOString().slice(0, 10);
    const history = await yahooFinance.historical(ticker, {
      period1: fromDate,
      period2: toDate,
      interval: '1d',
    });
    // Return in Finnhub-like format for compatibility
    return {
      s: history.length > 1 ? 'ok' : 'no_data',
      c: history.map(day => day.close),
      t: history.map(day => Math.floor(new Date(day.date).getTime() / 1000)),
    };
  } catch (err) {
    console.log(`${ticker}: Error fetching historical prices from Yahoo Finance`, err.message);
    return { s: 'error', c: [], t: [] };
  }
}

function daysBetween(date1, date2) {
  return Math.abs((date1 - date2) / (1000 * 60 * 60 * 24));
}

async function getRecentEarningsCalendar(from, to) {
  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
  const response = await axios.get(url);
  return response.data;
}

async function main() {
  // Get recent earnings calendar for the last 5 days
  const now = new Date();
  const fromDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate = now.toISOString().slice(0, 10);
  const earningsCalendar = await getRecentEarningsCalendar(fromDate, toDate);
  console.log('Finnhub earnings calendar API response:', typeof(earningsCalendar));
  console.log('earningsCalendar keys:', Object.keys(earningsCalendar));
  console.log('earningsCalendar sample (first 1000 chars):', JSON.stringify(earningsCalendar, null, 2).slice(0, 1000));

  const tickers = await getSP500Tickers();
  // Build a set of S&P 500 tickers for quick lookup
  const sp500Set = new Set(tickers);
  const earningsArray = earningsCalendar.earningsCalendar;

  console.log('earningsArrayLength:', earningsArray.length);
  const sp500Earnings = earningsArray.filter(e => sp500Set.has(e.symbol));
  console.log('sp500Earnings:', sp500Earnings);
  // Remove the limit, process all S&P 500 tickers with recent earnings
  // const selectedEarnings = sp500Earnings.slice(0, 5);
  console.log('Selected S&P 500 earnings:', sp500Earnings.map(e => `${e.symbol} (${e.date})`));

  const nowUnix = Math.floor(now.getTime() / 1000);
  const results = [];
  for (const earning of sp500Earnings) {
    const ticker = earning.symbol;
    const earningsDate = new Date(earning.date);
    const earningsUnix = Math.floor(earningsDate.getTime() / 1000);
    console.log(`\nProcessing ${ticker}: earnings date ${earning.date}`);
    try {
      const marketCap = await getMarketCap(ticker);
      if (!marketCap || marketCap < 5_000_000_000) {
        console.log(`${ticker}: Market cap below $5B, skipping.`);
        continue;
      }
      // Get historical prices: from one day before earnings date to today
      const fromUnix = earningsUnix - 86400; // one day before
      const history = await getHistoricalPrices(ticker, fromUnix, nowUnix);
      if (!history || history.s !== 'ok' || !history.c || history.c.length < 2) {
        console.log(`${ticker}: Not enough price data.`);
        continue;
      }
      const priceBeforeEarnings = history.c[0];
      const priceToday = history.c[history.c.length - 1];
      const change = ((priceToday - priceBeforeEarnings) / priceBeforeEarnings) * 100;
      console.log(`${ticker}: Price day before earnings = $${priceBeforeEarnings}, Price today = $${priceToday}, Change = ${change.toFixed(2)}%`);
      results.push({
        ticker,
        earningsDate: earning.date,
        marketCap,
        priceBeforeEarnings,
        priceToday,
        change
      });
    } catch (err) {
      console.log(`${ticker}: Error fetching data`, err.message);
    }
  }

  // Sort and display top 5 positive and top 5 negative changes
  const sorted = results.sort((a, b) => b.change - a.change);
  console.log('\nTop 5 Positive Changes:');
  sorted.slice(0, 5).forEach(stock => {
    console.log(`${stock.ticker}: ${stock.change.toFixed(2)}% (from $${stock.priceBeforeEarnings} to $${stock.priceToday})`);
  });
  console.log('\nTop 5 Drops:');
  sorted.slice(-5).reverse().forEach(stock => {
    console.log(`${stock.ticker}: ${stock.change.toFixed(2)}% (from $${stock.priceBeforeEarnings} to $${stock.priceToday})`);
  });
  console.log('Script finished.');
}

main(); 