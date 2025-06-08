const yahooFinance = require('yahoo-finance2').default;
const fetch = require('node-fetch');

// Custom fetch function to handle European consent redirects
const customFetch = (url, options = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
      'Referer': 'https://finance.yahoo.com/',
    },
    redirect: 'follow',
  });
};

// Configure yahoo-finance2 to use the custom fetch function
yahooFinance.setGlobalConfig({ fetcher: customFetch });

module.exports = yahooFinance; 