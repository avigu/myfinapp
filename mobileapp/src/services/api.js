// Configure the base URL based on your server location
// Using the cloud server for both development and production since it has live data
const BASE_URL = 'https://myfinapp-594349697203.europe-west1.run.app';

class ApiService {
  async fetchStockData(selectedIndex = 'sp500', selectedDate = null) {
    try {
      const url = selectedIndex === 'nasdaq' ? '/nasdaq' : '/';
      const params = new URLSearchParams();
      
      if (selectedDate) {
        params.append('start', selectedDate);
      }
      
      const queryString = params.toString();
      const fetchUrl = `${BASE_URL}${url}${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching from:', fetchUrl);
      
      const response = await fetch(fetchUrl, {
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
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