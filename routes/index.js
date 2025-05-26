const express = require('express');
const router = express.Router();
const path = require('path');
const { getInvestmentOpportunities, getInvestmentOpportunitiesWithBuyAnalysis, getUpcomingRelevantEarnings } = require('../services/opportunities');
const { renderTabbedHtml } = require('../utils/render');
const { analyzeStock, validateStockData } = require('../services/aiAnalysis');

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

// New endpoint for AI stock analysis
router.post('/api/ai-analysis', express.json(), async (req, res) => {
  try {
    console.log('[AI-ANALYSIS] === AI Analysis Request Started ===');
    console.log('[AI-ANALYSIS] Request body received:', JSON.stringify(req.body, null, 2));
    console.log('[AI-ANALYSIS] Request headers:', {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'origin': req.headers['origin']
    });

    const stockData = req.body;

    // Validate input data
    console.log('[AI-ANALYSIS] Validating stock data...');
    const validation = validateStockData(stockData);
    console.log('[AI-ANALYSIS] Validation result:', {
      isValid: validation.isValid,
      errors: validation.errors || 'No errors'
    });

    if (!validation.isValid) {
      console.log('[AI-ANALYSIS] Validation failed, returning 400 error');
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: validation.errors 
      });
    }

    // Call the AI analysis service
    console.log('[AI-ANALYSIS] Calling analyzeStock service with data:', JSON.stringify(stockData, null, 2));
    const startTime = Date.now();
    const aiAnalysis = await analyzeStock(stockData);
    const endTime = Date.now();
    
    console.log('[AI-ANALYSIS] AI service completed in', (endTime - startTime), 'ms');
    console.log('[AI-ANALYSIS] AI analysis result:', JSON.stringify(aiAnalysis, null, 2));
    console.log('[AI-ANALYSIS] === AI Analysis Request Completed Successfully ===');
    
    res.json(aiAnalysis);

  } catch (error) {
    console.error('[AI-ANALYSIS] === AI Analysis Request Failed ===');
    console.error('[AI-ANALYSIS] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    console.error('[AI-ANALYSIS] Request body that caused error:', JSON.stringify(req.body, null, 2));
    
    // Return appropriate error response based on error type
    if (error.message.includes('OpenAI API key')) {
      console.error('[AI-ANALYSIS] OpenAI API key configuration error');
      res.status(500).json({ 
        error: 'AI service configuration error', 
        details: 'OpenAI API key is not properly configured. Please contact support.' 
      });
    } else if (error.message.includes('quota exceeded')) {
      console.error('[AI-ANALYSIS] OpenAI quota exceeded');
      res.status(503).json({ 
        error: 'AI service temporarily unavailable', 
        details: 'Service quota exceeded. Please try again later.' 
      });
    } else if (error.message.includes('rate limit')) {
      console.error('[AI-ANALYSIS] OpenAI rate limit hit');
      res.status(429).json({ 
        error: 'Too many requests', 
        details: 'Please wait a moment before trying again.' 
      });
    } else {
      console.error('[AI-ANALYSIS] Unknown error occurred');
      res.status(500).json({ 
        error: 'AI analysis failed', 
        details: error.message 
      });
    }
  }
});

module.exports = router; 