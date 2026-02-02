const yahooFinance = require('yahoo-finance2').default;
const fetch = require('node-fetch');

// Custom fetch function to handle European consent redirects
const customFetch = (url, options = {}) => {
  console.log(`[DEBUG] Yahoo Finance API call to: ${url}`);
  
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://finance.yahoo.com/',
      'Origin': 'https://finance.yahoo.com',
      // Add cookie to bypass consent if we have one
      'Cookie': 'guc=eyJhZGNvbnNlbnQiOjEsImNvbnNlbnQiOjF9; A1=d=AQABBFpLZGcCEJvT0HN4I4hAOUF7TsO5gQcFEgEBCAE; A3=d=AQABBFpLZGcCEJvT0HN4I4hAOUF7TsO5gQcFEgEBCAE',
    },
    redirect: 'follow',
    // Set timeout to handle slow consent redirects
    timeout: 30000,
    // Handle compression
    compress: true,
  }).then(response => {
    // Log response for debugging
    console.log(`[DEBUG] Response status: ${response.status}, URL: ${response.url}`);
    
    // Check if we're being redirected to consent page
    if (response.url.includes('guce.yahoo.com') || 
        response.url.includes('consent.yahoo.com') ||
        response.url.includes('guccounter=1')) {
      console.log(`[WARN] Consent redirect detected: ${response.url}`);
      // For consent redirects, we'll return the response as-is
      // yahoo-finance2 should handle this internally
    }
    
    return response;
  }).catch(error => {
    console.error(`[ERROR] Fetch error for ${url}:`, error.message);
    throw error;
  });
};

// Configure yahoo-finance2 with enhanced settings
yahooFinance.setGlobalConfig({ 
  fetcher: customFetch,
  // Add additional configuration to help with consent handling
  queue: {
    concurrency: 1, // Reduce concurrency to avoid rate limiting
    timeout: 30000,  // Increase timeout for slow consent flows
  },
  validation: {
    logLevel: 'info', // Enable more logging
  },
});

// Wrapper function to handle consent redirect errors
const handleYahooFinanceCall = async (fn, ...args) => {
  const maxRetries = 2;
  const baseDelay = 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      const isConsentRedirectError = error.message && (
        error.message.includes('Unexpected redirect') ||
        error.message.includes('guccounter') ||
        error.message.includes('guce.yahoo.com') ||
        error.message.includes('consent.yahoo.com')
      );
      
      if (isConsentRedirectError && attempt < maxRetries) {
        const delay = baseDelay * attempt;
        console.log(`[WARN] Consent redirect error detected on attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms...`);
        console.log(`[WARN] Error details: ${error.message}`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's the last attempt or not a consent error, throw the error
      console.error(`[ERROR] Yahoo Finance call failed after ${attempt} attempts:`, error.message);
      throw error;
    }
  }
};

// Wrapper functions for common yahoo-finance2 methods
const wrappedYahooFinance = {
  quote: (...args) => handleYahooFinanceCall(yahooFinance.quote.bind(yahooFinance), ...args),
  quoteSummary: (...args) => handleYahooFinanceCall(yahooFinance.quoteSummary.bind(yahooFinance), ...args),
  historical: (...args) => handleYahooFinanceCall(yahooFinance.historical.bind(yahooFinance), ...args),
  search: (...args) => handleYahooFinanceCall(yahooFinance.search.bind(yahooFinance), ...args),
  // Pass through any other methods
  ...yahooFinance,
};

module.exports = wrappedYahooFinance; 