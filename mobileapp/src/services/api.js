// Configure the base URL based on your server location
// Using the cloud server for both development and production since it has live data
const BASE_URL = 'https://myfinapp-594349697203.europe-west1.run.app';

class ApiService {
  async fetchStockData(selectedIndex = 'sp500', selectedDate = null) {
    try {
      console.log('📱 [API] Starting fetchStockData...');
      console.log('📱 [API] selectedIndex:', selectedIndex);
      console.log('📱 [API] selectedDate:', selectedDate);
      
      const url = selectedIndex === 'nasdaq' ? '/nasdaq' : '/';
      const params = new URLSearchParams();
      
      if (selectedDate) {
        params.append('start', selectedDate);
      }
      
      const queryString = params.toString();
      const fetchUrl = `${BASE_URL}${url}${queryString ? `?${queryString}` : ''}`;
      
      console.log('📱 [API] Fetching from:', fetchUrl);
      
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(fetchUrl, {
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('📱 [API] Response status:', response.status);
      console.log('📱 [API] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('📱 [API] HTTP Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📱 [API] Success! Data keys:', Object.keys(data || {}));
      console.log('📱 [API] Data sample:', {
        indexKey: data?.indexKey,
        topGainersCount: data?.topGainers?.length || 0,
        topLosersCount: data?.topLosers?.length || 0,
        opportunitiesCount: data?.opportunities?.length || 0
      });
      
      return data;
    } catch (error) {
      console.error('📱 [API] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection.');
      }
      
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }

  // Helper method to get current date in YYYY-MM-DD format
  getCurrentDate() {
    return new Date().toISOString().slice(0, 10);
  }

  // Helper method to format market cap
  formatMarketCap(cap) {
    if (!cap || cap === 0) return 'N/A';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
    return `$${cap}`;
  }

  // Helper method to format price
  formatPrice(price) {
    if (!price || isNaN(price)) return 'N/A';
    return `$${price.toFixed(2)}`;
  }

  // Helper method to format change percentage
  formatChange(change) {
    if (!change || isNaN(change)) return '0.00%';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }
}

export default new ApiService(); 