// Test script to verify Alpha Vantage and Finnhub integration
require('dotenv').config();
const dataProvider = require('./config/dataProvider');

async function testDataProvider() {
  console.log('Testing Alpha Vantage and Finnhub integration...\n');
  
  const testTickers = ['AAPL', 'MSFT', 'GOOGL'];
  const results = {
    successes: 0,
    failures: 0,
    errors: []
  };
  
  // Test quote endpoint
  console.log('=== Testing Quote Data ===');
  for (const ticker of testTickers) {
    console.log(`\nTesting quote for ${ticker}...`);
    
    try {
      const quote = await dataProvider.quote(ticker);
      if (quote && quote.price) {
        console.log(`  ✅ Success: ${ticker} - Price: $${quote.price}, Source: ${quote.source}`);
        if (quote.marketCap) {
          console.log(`     Market Cap: $${(quote.marketCap / 1e9).toFixed(1)}B`);
        }
        results.successes++;
      } else {
        console.log(`  ❌ Error: ${ticker} - No quote data available`);
        results.failures++;
        results.errors.push({ ticker, endpoint: 'quote', error: 'No data' });
      }
    } catch (error) {
      console.log(`  ❌ Error for ${ticker} quote: ${error.message}`);
      results.failures++;
      results.errors.push({ ticker, endpoint: 'quote', error: error.message });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test historical data
  console.log('\n=== Testing Historical Data ===');
  for (const ticker of testTickers) {
    console.log(`\nTesting historical data for ${ticker}...`);
    
    try {
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const toDate = new Date().toISOString().slice(0, 10);
      
      const history = await dataProvider.historical(ticker, fromDate, toDate);
      
      if (history && history.length > 0) {
        console.log(`  ✅ Success: ${ticker} - Retrieved ${history.length} days of data`);
        console.log(`     Latest: ${history[0].date} - $${history[0].close}`);
        results.successes++;
      } else {
        console.log(`  ❌ Error: ${ticker} - No historical data available`);
        results.failures++;
        results.errors.push({ ticker, endpoint: 'historical', error: 'No data' });
      }
    } catch (error) {
      console.log(`  ❌ Error for ${ticker} historical: ${error.message}`);
      results.failures++;
      results.errors.push({ ticker, endpoint: 'historical', error: error.message });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test company profile
  console.log('\n=== Testing Company Profile ===');
  for (const ticker of testTickers) {
    console.log(`\nTesting company profile for ${ticker}...`);
    
    try {
      const profile = await dataProvider.profile(ticker);
      
      if (profile && profile.name) {
        console.log(`  ✅ Success: ${ticker} - ${profile.name}, Source: ${profile.source}`);
        console.log(`     Sector: ${profile.sector}, Industry: ${profile.industry}`);
        results.successes++;
      } else {
        console.log(`  ❌ Error: ${ticker} - No profile data available`);
        results.failures++;
        results.errors.push({ ticker, endpoint: 'profile', error: 'No data' });
      }
    } catch (error) {
      console.log(`  ❌ Error for ${ticker} profile: ${error.message}`);
      results.failures++;
      results.errors.push({ ticker, endpoint: 'profile', error: error.message });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test market cap
  console.log('\n=== Testing Market Cap ===');
  for (const ticker of testTickers) {
    console.log(`\nTesting market cap for ${ticker}...`);
    
    try {
      const marketCap = await dataProvider.getMarketCap(ticker);
      
      if (marketCap) {
        console.log(`  ✅ Success: ${ticker} - Market Cap: $${(marketCap / 1e9).toFixed(1)}B`);
        results.successes++;
      } else {
        console.log(`  ❌ Error: ${ticker} - No market cap data available`);
        results.failures++;
        results.errors.push({ ticker, endpoint: 'marketCap', error: 'No data' });
      }
    } catch (error) {
      console.log(`  ❌ Error for ${ticker} market cap: ${error.message}`);
      results.failures++;
      results.errors.push({ ticker, endpoint: 'marketCap', error: error.message });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test earnings calendar
  console.log('\n=== Testing Earnings Calendar ===');
  try {
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    console.log(`Testing earnings calendar from ${fromDate} to ${toDate}...`);
    const earnings = await dataProvider.getEarningsCalendar(fromDate, toDate);
    
    if (earnings && earnings.earningsCalendar && earnings.earningsCalendar.length > 0) {
      console.log(`  ✅ Success: Retrieved ${earnings.earningsCalendar.length} earnings events`);
      console.log(`     First event: ${earnings.earningsCalendar[0].date} - ${earnings.earningsCalendar[0].symbol}`);
      results.successes++;
    } else {
      console.log('  ❌ Error: No earnings calendar data available');
      results.failures++;
      results.errors.push({ endpoint: 'earningsCalendar', error: 'No data' });
    }
  } catch (error) {
    console.log(`  ❌ Error for earnings calendar: ${error.message}`);
    results.failures++;
    results.errors.push({ endpoint: 'earningsCalendar', error: error.message });
  }
  
  // Test insider transactions
  console.log('\n=== Testing Insider Transactions ===');
  for (const ticker of testTickers) {
    console.log(`\nTesting insider transactions for ${ticker}...`);
    
    try {
      const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const toDate = new Date().toISOString().slice(0, 10);
      
      const insiderData = await dataProvider.getInsiderTransactions(ticker, fromDate, toDate);
      
      if (insiderData && insiderData.data && insiderData.data.length > 0) {
        console.log(`  ✅ Success: ${ticker} - Retrieved ${insiderData.data.length} insider transactions`);
        results.successes++;
      } else {
        console.log(`  ⚠️ Warning: ${ticker} - No insider transactions found (this may be normal)`);
        // Don't count as failure since some stocks might not have recent insider activity
        results.successes++;
      }
    } catch (error) {
      console.log(`  ❌ Error for ${ticker} insider transactions: ${error.message}`);
      results.failures++;
      results.errors.push({ ticker, endpoint: 'insiderTransactions', error: error.message });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total tests: ${results.successes + results.failures}`);
  console.log(`Successes: ${results.successes}`);
  console.log(`Failures: ${results.failures}`);
  
  if (results.failures > 0) {
    console.log('\nFailed tests:');
    results.errors.forEach(({ ticker, endpoint, error }) => {
      console.log(`  - ${ticker || ''} ${endpoint}: ${error}`);
    });
  }
  
  const successRate = ((results.successes / (results.successes + results.failures)) * 100).toFixed(1);
  console.log(`\nSuccess rate: ${successRate}%`);
  
  if (results.failures === 0) {
    console.log('\n🎉 All tests passed! Alpha Vantage and Finnhub integration is working properly.');
  } else if (successRate >= 50) {
    console.log('\n⚠️ Some tests failed, but integration appears to be working partially.');
    console.log('   Make sure you have valid API keys for both Alpha Vantage and Finnhub.');
  } else {
    console.log('\n❌ Many tests failed. Check your API keys and configuration.');
  }
  
  process.exit(results.failures === 0 ? 0 : 1);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the test
testDataProvider().catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
}); 