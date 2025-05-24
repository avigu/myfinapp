import React, { useState, useEffect } from 'react';
import StockCard from './components/StockCard';
import IndexSelector from './components/IndexSelector';
import DateSelector from './components/DateSelector';
import EarningsCalendar from './components/EarningsCalendar';
import LoadingSpinner from './components/LoadingSpinner';
import './styles/App.css';

const App = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState('sp500');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState('gainers');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedIndex === 'nasdaq' ? '/nasdaq' : '/';
      const params = new URLSearchParams({ start: selectedDate });
      const response = await fetch(`${url}?${params}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedIndex, selectedDate]);

  const handleRefresh = () => {
    fetchData();
  };

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <div className="error-container">
      <div className="error-message">
        <h2>⚠️ Error</h2>
        <p>{error}</p>
        <button onClick={handleRefresh} className="retry-button">
          Try Again
        </button>
      </div>
    </div>
  );

  const { topGainers = [], topLosers = [], opportunities = [], upcomingEarnings = [] } = data || {};

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">
            📈 MyFinApp
          </h1>
          <p className="app-subtitle">Real-time S&P 500 & NASDAQ Investment Opportunities</p>
        </div>
      </header>

      <div className="controls">
        <IndexSelector 
          selectedIndex={selectedIndex} 
          onIndexChange={setSelectedIndex} 
        />
        <DateSelector 
          selectedDate={selectedDate} 
          onDateChange={setSelectedDate} 
        />
        <button onClick={handleRefresh} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      <div className="main-content">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'gainers' ? 'active' : ''}`}
            onClick={() => setActiveTab('gainers')}
          >
            📈 Top Gainers ({topGainers.length})
          </button>
          <button 
            className={`tab ${activeTab === 'losers' ? 'active' : ''}`}
            onClick={() => setActiveTab('losers')}
          >
            📉 Top Losers ({topLosers.length})
          </button>
          <button 
            className={`tab ${activeTab === 'earnings' ? 'active' : ''}`}
            onClick={() => setActiveTab('earnings')}
          >
            📅 Upcoming Earnings ({upcomingEarnings.length})
          </button>
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            📊 All Opportunities ({opportunities.length})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'gainers' && (
            <div className="stock-grid">
              {topGainers.map((stock, index) => (
                <StockCard key={stock.ticker} stock={stock} rank={index + 1} type="gainer" />
              ))}
            </div>
          )}

          {activeTab === 'losers' && (
            <div className="stock-grid">
              {topLosers.map((stock, index) => (
                <StockCard key={stock.ticker} stock={stock} rank={index + 1} type="loser" />
              ))}
            </div>
          )}

          {activeTab === 'earnings' && (
            <EarningsCalendar earnings={upcomingEarnings} />
          )}

          {activeTab === 'all' && (
            <div className="stock-grid">
              {opportunities.map((stock, index) => (
                <StockCard 
                  key={stock.ticker} 
                  stock={stock} 
                  rank={index + 1} 
                  type={stock.change >= 0 ? 'gainer' : 'loser'} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="footer">
        <p>
          Data powered by Yahoo Finance & Finnhub • 
          Updated: {new Date().toLocaleString()} • 
          <a href="/" target="_blank" rel="noopener noreferrer">
            View Classic UI
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App; 