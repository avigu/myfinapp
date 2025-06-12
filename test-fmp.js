// Test script to verify Financial Modeling Prep configuration
const fmp = require('./config/fmpConfig');

async function testFMP() {
  console.log('Testing FMP configuration...\n');
  
  const testTickers = ['AAPL', 'MSFT', 'GOOGL'];
  const results = {
    successes: 0,
    failures: 0,
    errors: []
  };
  
  for (const ticker of testTickers) {
    console.log(`Testing ticker: ${ticker}`);
    
    try {
      // Test quote endpoint
      console.log(`  - Testing quote for ${ticker}...`);
      const quote = await fmp.quote(ticker);
      const marketCap = quote ? quote.marketCap : null;
      const currentPrice = quote ? quote.price : null;
      
      console.log(`  ✅ Success: ${ticker} - Market Cap: ${marketCap ? `$${(marketCap / 1e9).toFixed(1)}B` : 'N/A'}, Price: $${currentPrice}`);
      results.successes++;
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`  ❌ Error for ${ticker}: ${error.message}`);
      results.failures++;
      results.errors.push({ ticker, error: error.message });
    }
  }
  
  // Test historical data (used in historical service)
  console.log('\nTesting historical data...');
  try {
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toDate = new Date().toISOString().slice(0, 10);
    
    const history = await fmp.historical('AAPL', fromDate, toDate);
    
    console.log(`  ✅ Historical data success: Retrieved ${history.length} days of data for AAPL`);
    results.successes++;
    
  } catch (error) {
    console.log(`  ❌ Historical data error: ${error.message}`);
    results.failures++;
    results.errors.push({ ticker: 'AAPL_historical', error: error.message });
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
    results.errors.forEach(({ ticker, error }) => {
      console.log(`  - ${ticker}: ${error}`);
    });
  }
  
  const successRate = ((results.successes / (results.successes + results.failures)) * 100).toFixed(1);
  console.log(`\nSuccess rate: ${successRate}%`);
  
  if (results.failures === 0) {
    console.log('\n🎉 All tests passed! FMP configuration is working properly.');
  } else if (successRate >= 50) {
    console.log('\n⚠️  Some tests failed, but configuration appears to be working partially.');
    console.log('   This may be acceptable if errors are intermittent consent redirects.');
  } else {
    console.log('\n❌ Many tests failed. Configuration may need further adjustment.');
  }
  
  process.exit(results.failures === 0 ? 0 : 1);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the test
testFMP().catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
}); 