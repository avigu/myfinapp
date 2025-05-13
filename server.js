require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const yahooFinance = require('yahoo-finance2').default;
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd0gfql9r01qhao4tdc6gd0gfql9r01qhao4tdc70'; // Ensure you have this in .env

const DATA_DIR = path.join(__dirname, '.data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function getCacheFilePath(name) {
  return path.join(DATA_DIR, name + '.json');
}

function readCache(name, maxAgeMs) {
  const file = getCacheFilePath(name);
  if (!fs.existsSync(file)) return null;
  try {
    const { timestamp, data } = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() - timestamp < maxAgeMs) return data;
  } catch {}
  return null;
}

function writeCache(name, data) {
  const file = getCacheFilePath(name);
  fs.writeFileSync(file, JSON.stringify({ timestamp: Date.now(), data }), 'utf8');
}

app.use(express.static('public'));

// --- Helper Functions (adapted from index.js) ---
let cachedSP500Tickers = null;
let cachedSP500NameMap = null;
const TICKERS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getSP500TickersCached() {
  const cache = readCache('sp500-tickers', TICKERS_CACHE_MS);
  if (cache) {
    cachedSP500Tickers = cache.tickers;
    cachedSP500NameMap = cache.nameMap;
    return [cachedSP500Tickers, cachedSP500NameMap];
  }
  if (cachedSP500Tickers && cachedSP500NameMap) return [cachedSP500Tickers, cachedSP500NameMap];
  const { tickers, nameMap } = await getSP500Tickers();
  cachedSP500Tickers = tickers;
  cachedSP500NameMap = nameMap;
  writeCache('sp500-tickers', { tickers, nameMap });
  return [cachedSP500Tickers, cachedSP500NameMap];
}

async function getSP500Tickers() {
  console.log('Fetching S&P 500 tickers from Wikipedia...');
  const url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies';
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const tickers = [];
  const nameMap = {};
  $('table.wikitable tbody tr').each((i, elem) => {
    const symbol = $(elem).find('td').first().text().trim();
    const name = $(elem).find('td').eq(1).text().trim();
    if (symbol && symbol !== 'Symbol' && /^[A-Z.-]{1,6}$/.test(symbol) && !symbol.includes(' ')) {
      const ticker = symbol.replace('.', '-');
      tickers.push(ticker);
      nameMap[ticker] = name;
    }
  });
  if (!tickers.includes('PINS')) {
    tickers.unshift('PINS');
    nameMap['PINS'] = 'Pinterest';
  }
  for (let i = tickers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tickers[i], tickers[j]] = [tickers[j], tickers[i]];
  }
  return { tickers, nameMap };
}

const MARKETCAP_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getMarketCap(ticker) {
  const cache = readCache(`marketcap-${ticker}`, MARKETCAP_CACHE_MS);
  if (cache !== null && cache !== undefined) {
    return cache;
  }
  try {
    const quote = await yahooFinance.quoteSummary(ticker, { modules: ['price'] });
    const cap = quote.price.marketCap || null;
    writeCache(`marketcap-${ticker}`, cap);
    return cap;
  } catch (err) {
    console.log(`${ticker}: Error fetching market cap from Yahoo: ${err.message}`);
    return null;
  }
}

const HISTORICAL_CACHE_MS = 1 * 60 * 60 * 1000; // 1 hour

async function getHistoricalPrices(ticker, from, to) {
  const cacheKey = `historical-${ticker}-${from}-${to}`;
  const cache = readCache(cacheKey, HISTORICAL_CACHE_MS);
  if (cache) {
    return cache;
  }
  try {
    const fromDate = new Date(from * 1000).toISOString().slice(0, 10);
    const toDate = new Date(to * 1000).toISOString().slice(0, 10);
    const history = await yahooFinance.historical(ticker, { period1: fromDate, period2: toDate, interval: '1d' });
    const result = { s: history.length > 1 ? 'ok' : 'no_data', c: history.map(day => day.close), t: history.map(day => Math.floor(new Date(day.date).getTime() / 1000)) };
    writeCache(cacheKey, result);
    return result;
  } catch (err) {
    console.log(`${ticker}: Error fetching historical prices from Yahoo: ${err.message}`);
    return { s: 'error', c: [], t: [] };
  }
}

const EARNINGS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getRecentEarningsCalendar(from, to) {
  const cacheKey = `earnings-${from}-${to}`;
  const cache = readCache(cacheKey, EARNINGS_CACHE_MS);
  if (cache) {
    return cache;
  }
  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
  try {
    const response = await axios.get(url);
    writeCache(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching Finnhub earnings calendar:', error.message);
    return { earningsCalendar: [] }; // Return a default structure in case of error
  }
}

// Cache for upcoming earnings
let cachedUpcomingEarnings = null;
let cachedUpcomingEarningsTime = 0;
const UPCOMING_EARNINGS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getUpcomingRelevantEarnings() {
  const now = new Date();
  if (cachedUpcomingEarnings && (Date.now() - cachedUpcomingEarningsTime < UPCOMING_EARNINGS_CACHE_MS)) {
    return cachedUpcomingEarnings;
  }
  const fromDate = now.toISOString().slice(0, 10);
  const toDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const earningsCalendarData = await getRecentEarningsCalendar(fromDate, toDate);
  const [sp500Tickers, sp500NameMap] = await getSP500TickersCached();
  const sp500Set = new Set(sp500Tickers);
  const earningsArray = earningsCalendarData.earningsCalendar || [];
  const relevant = [];
  for (const earning of earningsArray) {
    if (!earning || !earning.symbol || !sp500Set.has(earning.symbol)) continue;
    try {
      const marketCap = await getMarketCap(earning.symbol);
      if (!marketCap || marketCap < 5_000_000_000) continue;
      relevant.push({
        ticker: earning.symbol,
        name: sp500NameMap[earning.symbol] || '',
        date: earning.date,
        marketCap
      });
    } catch {}
  }
  // Sort by date ascending
  cachedUpcomingEarnings = relevant.sort((a, b) => new Date(a.date) - new Date(b.date));
  cachedUpcomingEarningsTime = Date.now();
  return cachedUpcomingEarnings;
}

// --- Main Logic Function ---
async function getSP500InvestmentOpportunities(now = new Date()) {
  const fromDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate = now.toISOString().slice(0, 10);
  const earningsCalendarData = await getRecentEarningsCalendar(fromDate, toDate);
  const [sp500Tickers, sp500NameMap] = await getSP500TickersCached();
  const sp500Set = new Set(sp500Tickers);

  const earningsArray = earningsCalendarData.earningsCalendar || [];
  const sp500Earnings = earningsArray.filter(e => e && e.symbol && sp500Set.has(e.symbol));
  console.log('S&P 500 tickers with earning events:', sp500Earnings.map(e => e.symbol));

  const results = [];
  const nowUnix = Math.floor(now.getTime() / 1000);

  for (const earning of sp500Earnings) {
    const ticker = earning.symbol;
    if (!ticker) continue;
    const earningsDate = new Date(earning.date);
    const earningsUnix = Math.floor(earningsDate.getTime() / 1000);
    
    try {
      const marketCap = await getMarketCap(ticker);
      if (!marketCap || marketCap < 5_000_000_000) continue;

      // Fetch up to a week before earnings to ensure we get the last trading day
      const daysBack = 7;
      const fromUnixForHistory = earningsUnix - daysBack * 86400;
      const toUnixForHistory = earningsUnix;
      const history = await getHistoricalPrices(ticker, fromUnixForHistory, toUnixForHistory);
      if (!history || !history.c || history.c.length < 1) {
        continue;
      }
      // Use the last available close before the earnings date
      const priceBeforeEarnings = history.c[history.c.length - 1];
      // Get live price
      const liveQuote = await yahooFinance.quoteSummary(ticker, { modules: ['price'] });
      const priceNow = liveQuote.price.regularMarketPrice;
      if (!priceNow) {
        continue;
      }
      const change = ((priceNow - priceBeforeEarnings) / priceBeforeEarnings) * 100;
      
      results.push({
        ticker,
        name: sp500NameMap[ticker] || '',
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
  return results.sort((a, b) => b.change - a.change);
}

// --- Express Route ---
app.get('/', async (req, res) => {
  try {
    // Get start date from query or default to today
    const startDate = req.query.start || new Date().toISOString().slice(0, 10);
    const now = new Date(startDate);
    const opportunities = await getSP500InvestmentOpportunities(now);
    const topGainers = opportunities.slice(0, 5);
    // Only include stocks with negative change for topLosers
    const topLosers = opportunities.filter(stock => stock.change < 0).slice(-5).reverse();

    // Get upcoming relevant earnings
    const upcomingEarnings = await getUpcomingRelevantEarnings();

    let html = `
      <html>
        <head>
          <title>S&P 500 Investment Opportunities</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="manifest" href="/manifest.json">
          <link rel="icon" href="/icon-192.png">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #333; }
            ul { list-style-type: none; padding: 0; }
            li { background: #f4f4f4; margin: 5px 0; padding: 10px; border-radius: 5px; }
            .gainer { color: green; }
            .loser { color: red; }
            .loading { display: none; color: #007bff; font-weight: bold; }
            form { margin-bottom: 20px; }
            label { margin-right: 10px; }
            button { padding: 6px 16px; border-radius: 4px; border: none; background: #007bff; color: #fff; font-size: 1em; }
            button:active { background: #0056b3; }
            @media (max-width: 600px) {
              body { margin: 5px; font-size: 16px; }
              h1 { font-size: 1.5em; }
              h2 { font-size: 1.1em; }
              li { padding: 8px; font-size: 1em; }
              button { width: 100%; margin-top: 10px; }
            }
          </style>
          <script>
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/service-worker.js');
              });
            }
          </script>
        </head>
        <body>
          <h1>S&P 500 Investment Opportunities</h1>
          <form id="dateForm">
            <label for="start">Start date:</label>
            <input type="date" id="start" name="start" value="${startDate}">
            <button type="submit">Refresh</button>
            <span class="loading" id="loading">Loading...</span>
          </form>
          <script>
            const form = document.getElementById('dateForm');
            const loading = document.getElementById('loading');
            form.addEventListener('submit', function(e) {
              e.preventDefault();
              loading.style.display = 'inline';
              const start = document.getElementById('start').value;
              window.location = '/?start=' + start;
            });
            if (window.location.search.includes('start=')) {
              loading.style.display = 'none';
            }
          </script>

          <h2>Top 5 Positive Changes (Day Before Earnings to Today)</h2><ul>`;
    topGainers.forEach(stock => {
      html += `<li>${stock.ticker} (${stock.name}): <span class="gainer">${stock.change.toFixed(2)}%</span> (from $${stock.priceBeforeEarnings.toFixed(2)} to $${stock.priceNow.toFixed(2)})</li>`;
    });
    html += '</ul>';

    html += '<h2>Top 5 Drops (Day Before Earnings to Today)</h2><ul>';
    topLosers.forEach(stock => {
      html += `<li>${stock.ticker} (${stock.name}): <span class="loser">${stock.change.toFixed(2)}%</span> (from $${stock.priceBeforeEarnings.toFixed(2)} to $${stock.priceNow.toFixed(2)})</li>`;
    });

    // Add summary section
    html += `<h2>Summary</h2><p><strong>${opportunities.length}</strong> S&P 500 stocks had earnings in the last 10 days.</p>`;

    // Add upcoming earnings section at the end
    html += `<h2>Upcoming S&P 500 Earnings (Next 5 Days, Market Cap > $5B)</h2><ul>`;
    if (upcomingEarnings.length === 0) {
      html += '<li>No relevant upcoming earnings found.</li>';
    } else {
      upcomingEarnings.forEach(function(e) {
        html += `<li>${e.ticker} (${e.name}): ${e.date} (Market Cap: $${(e.marketCap/1e9).toFixed(1)}B)</li>`;
      });
    }
    html += '</ul>';

    html += '</ul></body></html>';
    res.send(html);
  } catch (error) {
    console.error("Error generating page:", error);
    res.status(500).send("Error generating investment opportunities page.");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 