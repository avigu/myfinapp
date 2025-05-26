const express = require('express');
const router = express.Router();
const path = require('path');
const { getInvestmentOpportunities, getInvestmentOpportunitiesWithBuyAnalysis, getUpcomingRelevantEarnings } = require('../services/opportunities');
const { renderTabbedHtml } = require('../utils/render');

// Serve React app
router.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/app.html'));
});

router.get(['/', '/nasdaq'], async (req, res) => {
  try {
    const indexKey = req.path === '/nasdaq' ? 'nasdaq' : 'sp500';
    const startDate = req.query.start || new Date().toISOString().slice(0, 10);
    const now = new Date(startDate);
    
    // Check if buy analysis is requested
    const includeBuyAnalysis = req.query.buyAnalysis === 'true';
    
    let opportunities, buyOpportunities = [], metadata = null;
    
    if (includeBuyAnalysis) {
      const result = await getInvestmentOpportunitiesWithBuyAnalysis(indexKey, now);
      opportunities = result.opportunities;
      buyOpportunities = result.buyOpportunities;
      metadata = result.metadata;
    } else {
      opportunities = await getInvestmentOpportunities(indexKey, now);
    }
    
    const topGainers = opportunities.filter(stock => stock.change > 0).slice(0, 5);
    const topLosers = opportunities.filter(stock => stock.change < 0).slice(-5).reverse();
    
    const upcomingEarnings = await getUpcomingRelevantEarnings(indexKey);
    
    const responseData = {
      indexKey,
      startDate,
      topGainers,
      topLosers,
      opportunities,
      buyOpportunities,
      upcomingEarnings,
      ...(metadata && { metadata })
    };
    
    // Check if the request wants JSON (from React app)
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json(responseData);
    } else {
      // Serve the original HTML view
      res.send(renderTabbedHtml(responseData));
    }
  } catch (error) {
    console.error(`[ERROR] Error generating page:`, error);
    console.error(`[ERROR] Error stack:`, error.stack);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.status(500).json({ error: 'Error generating investment opportunities data.', details: error.message });
    } else {
      res.status(500).send('Error generating investment opportunities page.');
    }
  }
});

// New endpoint specifically for buy opportunities
router.get('/buy-opportunities', async (req, res) => {
  try {
    const indexKey = req.query.index || 'sp500';
    const startDate = req.query.start || new Date().toISOString().slice(0, 10);
    const now = new Date(startDate);
    
    const result = await getInvestmentOpportunitiesWithBuyAnalysis(indexKey, now);
    
    const responseData = {
      indexKey,
      startDate,
      buyOpportunities: result.buyOpportunities,
      totalAnalyzed: result.opportunities.length,
      droppedStocks: result.opportunities.filter(stock => stock.change < -7).length,
      metadata: result.metadata
    };
    
    res.json(responseData);
    
  } catch (error) {
    console.error(`[ERROR] Error generating buy opportunities:`, error);
    console.error(`[ERROR] Error stack:`, error.stack);
    res.status(500).json({ error: 'Error generating buy opportunities data.', details: error.message });
  }
});

module.exports = router; 