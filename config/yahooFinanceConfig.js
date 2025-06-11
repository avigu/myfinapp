const yahooFinance = require('yahoo-finance2').default;
const fetch = require('node-fetch');

// Detect if we're running in production environment
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.env.GOOGLE_CLOUD_PROJECT || 
                    process.env.K_SERVICE; // GCP Cloud Run env var

// Different strategies for local vs production
const getHeaders = () => {
  if (isProduction) {
    // Production strategy: Minimal headers to avoid fingerprinting
    return {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
  } else {
    // Local strategy: Use working browser headers and cookies
    return {
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
      'Cookie': 'A3=d=AQABBEOfRGgCED1TrM5AuXHrNCMGpBCy1w8FEgABCAHoRWh2aF5DyyMA9qMCAAcIPJ9EaJdWZmY&S=AQAAApRCfEjgHhl4TGEnoYJpV4U; A1S=d=AQABBEOfRGgCED1TrM5AuXHrNCMGpBCy1w8FEgABCAHoRWh2aF5DyyMA9qMCAAcIPJ9EaJdWZmY&S=AQAAApRCfEjgHhl4TGEnoYJpV4U; A1=d=AQABBEOfRGgCED1TrM5AuXHrNCMGpBCy1w8FEgABCAHoRWh2aF5DyyMA9qMCAAcIPJ9EaJdWZmY&S=AQAAApRCfEjgHhl4TGEnoYJpV4U; GUC=AQABCAFoRehodkIhBASv&s=AQAAADguV1TW&g=aESfTQ; axids=gam=y-yMv_3RxE2uKm.FW4fWFH2pEDbb1FqXEz~A&dv360=eS10WEhtSHZsRTJ1R25GbEhnbjlrOFNZYlBrdXVtaWJCM35B&ydsp=y-xkgGk.1E2uKYOURYiDzqr8CXr80B3TSa~A&tbla=y-OVlXg6pE2uJxt0p9u7Y9MML8zy5fZM11~A; tbla_id=0fe3cd7e-30bb-4a61-bd9d-fd7f7e14e7ce-tuctf3e24c6; PRF=t%3DAAPL%26dock-collapsed%3Dtrue; cmp=t=1749368562&j=1&u=1---&v=83; EuConsent=CQRWXMAQRWXMAAOACBHEBqFoAP_gAEPgACiQKptB9G7WTXFneTp2YPskOYwX0VBJ4MAwBgCBAcABzBIUIBwGVmAzJEyIICACGAIAIGBBIABtGAhAQEAAYIAFAABIAEgAIBAAIGAAACAAAABACAAAAAAAAAAQgEAXMBQgmCYEBFoIQUhAggAgAQAAAAAEAIgBCAQAEAAAQAAACAAIACgAAgAAAAAAAAAEAFAIEQAAIAECAgvkdQAAAAAAAAAIAAYACAABAAAAAIKpgAkGhUQRFgQAhEIGEECAAQUBABQIAgAACBAAAATBAUIAwAVGAiAEAIAAAAAAAAAAABAAABAAhAAEAAQIAAAAAIAAgAIBAAACAAAAAAAAAAAAAAAAAAAAAAAAAGIBAggCAABBAAQUAAAAAgAAAAAAAAAIgACAAAAAAAAAAAAAAIgAAAAAAAAAAAAAAAAAAIEAAAIAAAAoDEFgAAAAAAAAAAAAAACAABAAAAAIAAA',
    };
  }
};

// Custom fetch function with environment-aware headers
const customFetch = (url, options = {}) => {
  const environment = isProduction ? 'PRODUCTION' : 'LOCAL';
  console.log(`[DEBUG] [${environment}] Yahoo Finance API call to: ${url}`);
  
  const headers = getHeaders();
  
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...headers,
    },
    redirect: 'follow',
    timeout: 30000,
    compress: true,
  }).then(response => {
    console.log(`[DEBUG] [${environment}] Response status: ${response.status}, URL: ${response.url}`);
    
    if (response.url.includes('guce.yahoo.com') || 
        response.url.includes('consent.yahoo.com') ||
        response.url.includes('guccounter=1')) {
      console.log(`[WARN] [${environment}] Consent redirect detected: ${response.url}`);
    }
    
    return response;
  }).catch(error => {
    console.error(`[ERROR] [${environment}] Fetch error for ${url}:`, error.message);
    throw error;
  });
};

// Configure yahoo-finance2 with environment-aware settings
yahooFinance.setGlobalConfig({ 
  fetcher: customFetch,
  queue: {
    concurrency: isProduction ? 1 : 2, // More conservative in production
    timeout: 45000, // Longer timeout for production
  },
  validation: {
    logLevel: 'info',
  },
});

// Enhanced error handling with production-specific strategies
const handleYahooFinanceCall = async (fn, ...args) => {
  const maxRetries = isProduction ? 3 : 2; // More retries in production
  const baseDelay = isProduction ? 3000 : 2000; // Longer delays in production
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      const isConsentRedirectError = error.message && (
        error.message.includes('Unexpected redirect') ||
        error.message.includes('guccounter') ||
        error.message.includes('guce.yahoo.com') ||
        error.message.includes('consent.yahoo.com') ||
        error.message.includes('404') ||
        error.message.includes('403') ||
        error.message.includes('Too Many Requests')
      );
      
      if (isConsentRedirectError && attempt < maxRetries) {
        const delay = baseDelay * attempt * (isProduction ? 1.5 : 1); // Exponential backoff
        console.log(`[WARN] [${isProduction ? 'PRODUCTION' : 'LOCAL'}] Error on attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms...`);
        console.log(`[WARN] Error details: ${error.message}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      console.error(`[ERROR] [${isProduction ? 'PRODUCTION' : 'LOCAL'}] Yahoo Finance call failed after ${attempt} attempts:`, error.message);
      
      // In production, return null instead of throwing for graceful degradation
      if (isProduction && isConsentRedirectError) {
        console.log(`[WARN] [PRODUCTION] Returning null due to consent redirect error for graceful degradation`);
        return null;
      }
      
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