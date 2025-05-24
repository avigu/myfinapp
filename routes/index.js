const express = require('express');
const router = express.Router();
const { getInvestmentOpportunities, getUpcomingRelevantEarnings } = require('../services/opportunities');
const { renderTabbedHtml } = require('../utils/render');

router.get(['/', '/nasdaq'], async (req, res) => {
  try {
    const indexKey = req.path === '/nasdaq' ? 'nasdaq' : 'sp500';
    const startDate = req.query.start || new Date().toISOString().slice(0, 10);
    const now = new Date(startDate);
    const opportunities = await getInvestmentOpportunities(indexKey, now);
    const topGainers = opportunities.slice(0, 5);
    const topLosers = opportunities.filter(stock => stock.change < 0).slice(-5).reverse();
    const upcomingEarnings = await getUpcomingRelevantEarnings(indexKey);
    res.send(renderTabbedHtml({ indexKey, startDate, topGainers, topLosers, opportunities, upcomingEarnings }));
  } catch (error) {
    console.error('Error generating page:', error);
    res.status(500).send('Error generating investment opportunities page.');
  }
});

module.exports = router; 