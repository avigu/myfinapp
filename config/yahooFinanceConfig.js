const yahooFinance = require('yahoo-finance2').default;
const fetch = require('node-fetch');

// Custom fetch function to handle European consent redirects
const customFetch = (url, options = {}) => {
  console.log(`[DEBUG] Yahoo Finance API call to: ${url}`);
  
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
      'Cache-Control': 'max-age=0',
      'Priority': 'u=0, i',
      'Sec-Ch-Ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Referer': 'https://consent.yahoo.com/',
      // Use the exact working cookies from your browser
      'Cookie': 'A3=d=AQABBEOfRGgCED1TrM5AuXHrNCMGpBCy1w8FEgABCAHoRWh2aF5DyyMA9qMCAAcIPJ9EaJdWZmY&S=AQAAApRCfEjgHhl4TGEnoYJpV4U; A1S=d=AQABBEOfRGgCED1TrM5AuXHrNCMGpBCy1w8FEgABCAHoRWh2aF5DyyMA9qMCAAcIPJ9EaJdWZmY&S=AQAAApRCfEjgHhl4TGEnoYJpV4U; A1=d=AQABBEOfRGgCED1TrM5AuXHrNCMGpBCy1w8FEgABCAHoRWh2aF5DyyMA9qMCAAcIPJ9EaJdWZmY&S=AQAAApRCfEjgHhl4TGEnoYJpV4U; GUC=AQABCAFoRehodkIhBASv&s=AQAAADguV1TW&g=aESfTQ; axids=gam=y-yMv_3RxE2uKm.FW4fWFH2pEDbb1FqXEz~A&dv360=eS10WEhtSHZsRTJ1R25GbEhnbjlrOFNZYlBrdXVtaWJCM35B&ydsp=y-xkgGk.1E2uKYOURYiDzqr8CXr80B3TSa~A&tbla=y-OVlXg6pE2uJxt0p9u7Y9MML8zy5fZM11~A; tbla_id=0fe3cd7e-30bb-4a61-bd9d-fd7f7e14e7ce-tuctf3e24c6; PRF=t%3DAAPL%26dock-collapsed%3Dtrue; cmp=t=1749368562&j=1&u=1---&v=83; EuConsent=CQRWXMAQRWXMAAOACBHEBqFoAP_gAEPgACiQKptB9G7WTXFneTp2YPskOYwX0VBJ4MAwBgCBAcABzBIUIBwGVmAzJEyIICACGAIAIGBBIABtGAhAQEAAYIAFAABIAEgAIBAAIGAAACAAAABACAAAAAAAAAAQgEAXMBQgmCYEBFoIQUhAggAgAQAAAAAEAIgBCAQAEAAAQAAACAAIACgAAgAAAAAAAAAEAFAIEQAAIAECAgvkdQAAAAAAAAAIAAYACAABAAAAAIKpgAkGhUQRFgQAhEIGEECAAQUBABQIAgAACBAAAATBAUIAwAVGAiAEAIAAAAAAAAAAABAAABAAhAAEAAQIAAAAAIAAgAIBAAACAAAAAAAAAAAAAAAAAAAAAAAAAGIBAggCAABBAAQUAAAAAgAAAAAAAAAIgACAAAAAAAAAAAAAAIgAAAAAAAAAAAAAAAAAAIEAAAIAAAAoDEFgAAAAAAAAAAAAAACAABAAAAAIAAA',
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