const express = require('express');
const router = express.Router();
const path = require('path');
const { getInvestmentOpportunities, getUpcomingRelevantEarnings } = require('../services/opportunities');
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
    const opportunities = await getInvestmentOpportunities(indexKey, now);
    const topGainers = opportunities.slice(0, 5);
    const topLosers = opportunities.filter(stock => stock.change < 0).slice(-5).reverse();
    const upcomingEarnings = await getUpcomingRelevantEarnings(indexKey);
    
    // Check if the request wants JSON (from React app)
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json({
        indexKey,
        startDate,
        topGainers,
        topLosers,
        opportunities,
        upcomingEarnings
      });
    } else {
      // Serve the original HTML view
      res.send(renderTabbedHtml({ indexKey, startDate, topGainers, topLosers, opportunities, upcomingEarnings }));
    }
  } catch (error) {
    console.error('Error generating page:', error);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.status(500).json({ error: 'Error generating investment opportunities data.' });
    } else {
      res.status(500).send('Error generating investment opportunities page.');
    }
  }
});

module.exports = router; 