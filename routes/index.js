const express = require('express');
const router = express.Router();
const path = require('path');
const { getInvestmentOpportunities, getInvestmentOpportunitiesWithBuyAnalysis, getUpcomingRelevantEarnings } = require('../services/opportunities');
const { renderTabbedHtml } = require('../utils/render');
const { analyzeStock, validateStockData } = require('../services/aiAnalysis');
const { createLogger } = require('../utils/logger');

const log = createLogger('ROUTES');

// Serve React app
router.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/app.html'));
});

router.get(['/', '/nasdaq'], async (req, res) => {
  const startTime = log.requestStart(req.method, req.path, req.query);

  try {
    const indexKey = req.path === '/nasdaq' ? 'nasdaq' : 'sp500';
    const startDate = req.query.start || new Date().toISOString().slice(0, 10);
    const now = new Date(startDate);

    // Check if buy analysis is requested
    const includeBuyAnalysis = req.query.buyAnalysis === 'true';

    log.info(`Processing investment opportunities`, { indexKey, startDate, includeBuyAnalysis });

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

    log.info(`Response prepared`, {
      totalOpportunities: opportunities.length,
      gainers: topGainers.length,
      losers: topLosers.length,
      buyOpportunities: buyOpportunities.length,
      upcomingEarnings: upcomingEarnings.length
    });

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
      log.requestEnd(req.method, req.path, startTime, 200);
    } else {
      // Serve the original HTML view
      res.send(renderTabbedHtml(responseData));
      log.requestEnd(req.method, req.path, startTime, 200);
    }
  } catch (error) {
    log.error(`Error generating page`, { error: error.message, stack: error.stack });

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.status(500).json({ error: 'Error generating investment opportunities data.', details: error.message });
    } else {
      res.status(500).send('Error generating investment opportunities page.');
    }
    log.requestEnd(req.method, req.path, startTime, 500);
  }
});

// New endpoint specifically for buy opportunities
router.get('/buy-opportunities', async (req, res) => {
  const startTime = log.requestStart(req.method, req.path, req.query);

  try {
    const indexKey = req.query.index || 'sp500';
    const startDate = req.query.start || new Date().toISOString().slice(0, 10);
    const now = new Date(startDate);

    log.info(`Fetching buy opportunities`, { indexKey, startDate });

    const result = await getInvestmentOpportunitiesWithBuyAnalysis(indexKey, now);

    const responseData = {
      indexKey,
      startDate,
      buyOpportunities: result.buyOpportunities,
      totalAnalyzed: result.opportunities.length,
      droppedStocks: result.opportunities.filter(stock => stock.change < -7).length,
      metadata: result.metadata
    };

    log.info(`Buy opportunities response ready`, {
      totalAnalyzed: responseData.totalAnalyzed,
      droppedStocks: responseData.droppedStocks,
      buyOpportunities: responseData.buyOpportunities.length
    });

    res.json(responseData);
    log.requestEnd(req.method, req.path, startTime, 200);

  } catch (error) {
    log.error(`Error generating buy opportunities`, { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error generating buy opportunities data.', details: error.message });
    log.requestEnd(req.method, req.path, startTime, 500);
  }
});

// New endpoint for AI stock analysis
router.post('/api/ai-analysis', express.json(), async (req, res) => {
  const aiLog = createLogger('AI-ANALYSIS');
  const startTime = aiLog.requestStart(req.method, req.path);

  try {
    aiLog.info(`Request received`, { ticker: req.body?.ticker });
    aiLog.debug(`Request body`, req.body);

    const stockData = req.body;

    // Validate input data
    const validation = validateStockData(stockData);
    aiLog.debug(`Validation result`, { isValid: validation.isValid, errors: validation.errors || null });

    if (!validation.isValid) {
      aiLog.warn(`Validation failed`, { errors: validation.errors });
      aiLog.requestEnd(req.method, req.path, startTime, 400);
      return res.status(400).json({
        error: 'Invalid input data',
        details: validation.errors
      });
    }

    // Call the AI analysis service
    const apiStart = aiLog.apiCall('OpenAI', 'analyzeStock', stockData.ticker);
    const aiAnalysis = await analyzeStock(stockData);
    aiLog.apiResult('OpenAI', 'analyzeStock', apiStart, true, { status: aiAnalysis.status });

    aiLog.info(`Analysis completed`, { ticker: stockData.ticker, status: aiAnalysis.status });

    res.json(aiAnalysis);
    aiLog.requestEnd(req.method, req.path, startTime, 200);

  } catch (error) {
    aiLog.error(`Analysis failed`, { error: error.message, name: error.name });

    // Return appropriate error response based on error type
    let statusCode = 500;
    let errorResponse = { error: 'AI analysis failed', details: error.message };

    if (error.message.includes('OpenAI API key')) {
      aiLog.error(`OpenAI API key configuration error`);
      errorResponse = {
        error: 'AI service configuration error',
        details: 'OpenAI API key is not properly configured. Please contact support.'
      };
    } else if (error.message.includes('quota exceeded')) {
      aiLog.error(`OpenAI quota exceeded`);
      statusCode = 503;
      errorResponse = {
        error: 'AI service temporarily unavailable',
        details: 'Service quota exceeded. Please try again later.'
      };
    } else if (error.message.includes('rate limit')) {
      aiLog.error(`OpenAI rate limit hit`);
      statusCode = 429;
      errorResponse = {
        error: 'Too many requests',
        details: 'Please wait a moment before trying again.'
      };
    }

    res.status(statusCode).json(errorResponse);
    aiLog.requestEnd(req.method, req.path, startTime, statusCode);
  }
});

module.exports = router; 