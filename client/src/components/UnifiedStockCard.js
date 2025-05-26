import React, { useState } from 'react';

const UnifiedStockCard = ({ stock, opportunity, rank, type }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  
  // Determine if this is a buy opportunity or regular stock
  const isBuyOpportunity = !!opportunity;
  const stockData = isBuyOpportunity ? opportunity.originalStock : stock;
  
  const { ticker, change, priceBeforeEarnings, priceNow, marketCap, earningsDate } = stockData;

  // Function to fetch real analysis data for regular stocks
  const fetchAnalysisData = async () => {
    if (analysisData || isBuyOpportunity) return; // Don't fetch if already have data or is buy opportunity
    
    setLoadingAnalysis(true);
    try {
      // TODO: Replace with actual API call to your backend
      // const response = await fetch(`/api/stock-analysis/${ticker}`);
      // const data = await response.json();
      
      // Simulated API call - replace with real implementation
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate loading
      
      // Generate realistic insider trading data
      const buyValue = Math.floor(Math.random() * 5000000);
      const sellValue = Math.floor(Math.random() * 3000000);
      
      // Calculate shares based on current price (more realistic)
      const totalBuys = Math.floor(buyValue / priceNow);
      const totalSells = Math.floor(sellValue / priceNow);
      
      const mockData = {
        insiderData: {
          signal: Math.random() > 0.5 ? '🟢' : Math.random() > 0.5 ? '🔴' : '⚪',
          buyValue: buyValue,
          sellValue: sellValue,
          totalBuys: totalBuys,
          totalSells: totalSells,
          hasValidPrices: Math.random() > 0.3
        },
        valuationData: {
          companyPE: (Math.random() * 30 + 5).toFixed(1),
          industryPE: (Math.random() * 25 + 8).toFixed(1),
          isUndervalued: Math.random() > 0.4,
          sector: ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer'][Math.floor(Math.random() * 5)]
        },
        analystData: {
          sentiment: Math.random() > 0.6 ? '🟢' : Math.random() > 0.3 ? '🟡' : '🔴',
          ratings: { 
            buy: Math.floor(Math.random() * 15), 
            hold: Math.floor(Math.random() * 10), 
            sell: Math.floor(Math.random() * 5) 
          },
          averagePriceTarget: priceNow * (1 + (Math.random() * 0.4 - 0.2)),
          upsidePotential: ((Math.random() * 40) - 20).toFixed(1)
        }
      };
      
      setAnalysisData(mockData);
    } catch (error) {
      console.error('Failed to fetch analysis data:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleShowDetails = async () => {
    if (!showDetails && !isBuyOpportunity) {
      await fetchAnalysisData();
    }
    setShowDetails(!showDetails);
  };

  // Get analysis data (either from opportunity or fetched data)
  const getAnalysisData = () => {
    if (isBuyOpportunity) {
      return {
        insiderData: opportunity.insiderData,
        valuationData: opportunity.valuationData,
        analystData: opportunity.analystData
      };
    }
    return analysisData;
  };

  const currentAnalysisData = getAnalysisData();

  const formatMarketCap = (cap) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
    return `$${cap}`;
  };

  const formatPrice = (price) => {
    return `$${price?.toFixed(2) || 'N/A'}`;
  };

  const formatChange = (change) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change?.toFixed(2) || '0.00'}%`;
  };

  const formatValue = (value) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value?.toFixed(0) || '0'}`;
  };

  const getCardClass = () => {
    let baseClass = 'unified-stock-card';
    
    if (isBuyOpportunity) {
      if (opportunity.recommendation === 'Strong Buy') baseClass += ' strong-buy';
      else if (opportunity.recommendation === 'Moderate Buy') baseClass += ' moderate-buy';
      else baseClass += ' avoid';
    } else {
      baseClass += ` ${type}`;
      if (change >= 5) baseClass += ' hot';
      if (change <= -5) baseClass += ' cold';
    }
    
    return baseClass;
  };

  return (
    <div className={getCardClass()}>
      <div className="card-header">
        <div className="rank-badge">#{rank}</div>
        <div className="ticker-info">
          <h3 className="ticker">{ticker}</h3>
          {earningsDate && (
            <span className="earnings-date">📅 {earningsDate}</span>
          )}
        </div>
        {isBuyOpportunity && (
          <div className="recommendation-badge">
            <span className={`recommendation ${opportunity.recommendation.toLowerCase().replace(' ', '-')}`}>
              {opportunity.recommendationColor} {opportunity.recommendation}
            </span>
          </div>
        )}
      </div>

      <div className="price-info">
        <div className="price-change">
          <span className={`change ${change >= 0 ? 'gainer' : 'loser'}`}>
            {formatChange(change)}
          </span>
        </div>
        
        <div className="price-details">
          <div className="price-row">
            <span className="label">Before:</span>
            <span className="value">{formatPrice(priceBeforeEarnings)}</span>
          </div>
          <div className="price-row">
            <span className="label">Current:</span>
            <span className="value current">{formatPrice(priceNow)}</span>
          </div>
        </div>
      </div>

      {/* Show criteria summary for buy opportunities only */}
      {isBuyOpportunity && (
        <div className="criteria-summary">
          <div className="criteria-count">
            <span className="label">Criteria Met:</span>
            <span className="value">{opportunity.criteriaMetCount}/4</span>
          </div>
          
          <div className="criteria-indicators">
            <span className={`indicator ${opportunity.criteria.droppedOver7Percent ? 'met' : 'not-met'}`} title="Dropped >7%">
              📉
            </span>
            <span className={`indicator ${opportunity.criteria.insiderBuying ? 'met' : 'not-met'}`} title="Insider Buying">
              {opportunity.insiderData.signal}
            </span>
            <span className={`indicator ${opportunity.criteria.undervalued ? 'met' : 'not-met'}`} title="Undervalued P/E">
              💰
            </span>
            <span className={`indicator ${opportunity.criteria.positiveAnalystSentiment ? 'met' : 'not-met'}`} title="Positive Analyst Sentiment">
              {opportunity.analystData.sentiment}
            </span>
          </div>
        </div>
      )}

      <div className="quick-stats">
        <div className="stat">
          <span className="label">Market Cap:</span>
          <span className="value">{formatMarketCap(marketCap)}</span>
        </div>
        
        {/* Show P/E ratio if available */}
        {currentAnalysisData?.valuationData?.companyPE && (
          <div className="stat">
            <span className="label">P/E Ratio:</span>
            <span className="value">
              {currentAnalysisData.valuationData.companyPE}
            </span>
          </div>
        )}
        
        {isBuyOpportunity && opportunity.analystData.upsidePotential && (
          <div className="stat">
            <span className="label">Upside:</span>
            <span className={`value ${opportunity.analystData.upsidePotential > 0 ? 'positive' : 'negative'}`}>
              {opportunity.analystData.upsidePotential > 0 ? '+' : ''}{opportunity.analystData.upsidePotential}%
            </span>
          </div>
        )}
        
        {!isBuyOpportunity && currentAnalysisData?.analystData?.upsidePotential && (
          <div className="stat">
            <span className="label">Upside:</span>
            <span className={`value ${currentAnalysisData.analystData.upsidePotential > 0 ? 'positive' : 'negative'}`}>
              {currentAnalysisData.analystData.upsidePotential > 0 ? '+' : ''}{currentAnalysisData.analystData.upsidePotential}%
            </span>
          </div>
        )}
      </div>

      <div className="card-actions">
        {/* Analysis button - calculates data on click */}
        <button 
          className="analysis-button"
          onClick={handleShowDetails}
          disabled={loadingAnalysis}
        >
          {loadingAnalysis ? (
            <>🔄 Analyzing...</>
          ) : showDetails ? (
            <>📊 Hide Analysis</>
          ) : (
            <>🔍 Analyze Stock</>
          )}
        </button>
        
        {/* External link button - clearly different design */}
        <a 
          className="external-link-button"
          href={`https://finance.yahoo.com/quote/${ticker}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          📈 Yahoo Finance ↗
        </a>
      </div>

      {/* Show detailed analysis when expanded */}
      {showDetails && (
        <div className="detailed-analysis">
          {loadingAnalysis ? (
            <div className="analysis-loading">
              <div className="loading-spinner"></div>
              <p>Calculating analysis data...</p>
            </div>
          ) : currentAnalysisData ? (
            <>
              <div className="analysis-section">
                <h4>🏢 Insider Trading (3 months)</h4>
                <div className="insider-data">
                  <div className="insider-stat">
                    <span>Buys: {formatValue(currentAnalysisData.insiderData.buyValue)} ({currentAnalysisData.insiderData.totalBuys} shares)</span>
                  </div>
                  <div className="insider-stat">
                    <span>Sells: {formatValue(currentAnalysisData.insiderData.sellValue)} ({currentAnalysisData.insiderData.totalSells} shares)</span>
                  </div>
                  <div className="insider-signal">
                    Signal: {currentAnalysisData.insiderData.signal}
                  </div>
                  {!currentAnalysisData.insiderData.hasValidPrices && (currentAnalysisData.insiderData.totalBuys > 0 || currentAnalysisData.insiderData.totalSells > 0) && (
                    <div className="insider-note">
                      <small>⚠️ Values estimated using current price (transaction prices not available)</small>
                    </div>
                  )}
                  {currentAnalysisData.insiderData.totalBuys === 0 && currentAnalysisData.insiderData.totalSells === 0 && (
                    <div className="insider-note">
                      <small>No insider trading activity in the last 3 months</small>
                    </div>
                  )}
                </div>
              </div>

              <div className="analysis-section">
                <h4>📊 Valuation Analysis</h4>
                <div className="valuation-data">
                  <div className="valuation-stat">
                    <span>Company P/E: {currentAnalysisData.valuationData.companyPE || 'N/A'}</span>
                  </div>
                  <div className="valuation-stat">
                    <span>Industry P/E: {currentAnalysisData.valuationData.industryPE || 'N/A'}</span>
                  </div>
                  <div className="valuation-status">
                    {currentAnalysisData.valuationData.isUndervalued ? '✅ Undervalued' : '❌ Not Undervalued'}
                  </div>
                  {currentAnalysisData.valuationData.sector && (
                    <div className="sector">
                      Sector: {currentAnalysisData.valuationData.sector}
                    </div>
                  )}
                </div>
              </div>

              <div className="analysis-section">
                <h4>🎯 Analyst Sentiment</h4>
                <div className="analyst-data">
                  <div className="ratings">
                    <span>Buy: {currentAnalysisData.analystData.ratings.buy}</span>
                    <span>Hold: {currentAnalysisData.analystData.ratings.hold}</span>
                    <span>Sell: {currentAnalysisData.analystData.ratings.sell}</span>
                  </div>
                  {currentAnalysisData.analystData.averagePriceTarget && (
                    <div className="price-target">
                      Avg Target: {formatPrice(currentAnalysisData.analystData.averagePriceTarget)}
                    </div>
                  )}
                  <div className="sentiment">
                    Sentiment: {currentAnalysisData.analystData.sentiment}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="analysis-error">
              <p>❌ Failed to load analysis data</p>
              <button onClick={fetchAnalysisData} className="retry-analysis-button">
                🔄 Retry Analysis
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UnifiedStockCard; 