const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Analyzes stock data using OpenAI and provides investment recommendations
 * @param {Object} stockData - The stock analysis data
 * @param {string} stockData.ticker - Stock ticker symbol
 * @param {string} stockData.priceMovement - Post-earnings price movement percentage
 * @param {string} stockData.insiderBuys - Insider buying activity in millions
 * @param {string} stockData.insiderSells - Insider selling activity in millions
 * @param {string} stockData.peRatio - Company P/E ratio
 * @param {string} stockData.industryPE - Industry average P/E ratio
 * @param {Object} stockData.analystRatings - Analyst ratings breakdown
 * @param {string} stockData.priceTarget - Average analyst price target
 * @param {string} stockData.currentPrice - Current stock price
 * @returns {Promise<Object>} AI analysis result with status and reasoning
 */
async function analyzeStock(stockData) {
  const {
    ticker,
    priceMovement,
    insiderBuys,
    insiderSells,
    peRatio,
    industryPE,
    analystRatings,
    priceTarget,
    currentPrice
  } = stockData;

  if (!ticker) {
    throw new Error('Ticker is required for AI analysis');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.');
  }

  const prompt = buildAnalysisPrompt({
    ticker,
    priceMovement,
    insiderBuys,
    insiderSells,
    peRatio,
    industryPE,
    analystRatings,
    priceTarget,
    currentPrice
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const aiResponse = completion.choices[0].message.content;
    
    // Parse the response to extract status and reason
    const parsedResponse = parseAIResponse(aiResponse);
    
    return {
      ...parsedResponse,
      fullResponse: aiResponse,
      timestamp: new Date().toISOString(),
      model: "gpt-3.5-turbo"
    };

  } catch (error) {
    console.error('[ERROR] OpenAI API call failed:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your billing.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    }
    
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

/**
 * Builds the analysis prompt for OpenAI
 * @param {Object} data - Stock data for analysis
 * @returns {string} Formatted prompt
 */
function buildAnalysisPrompt(data) {
  const {
    ticker,
    priceMovement,
    insiderBuys,
    insiderSells,
    peRatio,
    industryPE,
    analystRatings,
    priceTarget,
    currentPrice
  } = data;

  return `You are a financial analysis assistant in a stock insights app.

A user wants a second opinion on a stock. Based on the provided data, determine:

1. A one-word status: **Buy**, **Hold**, or **Sell**
2. A short explanation (2–3 sentences max), using plain English, with the key data points that support the recommendation.

Avoid hype. Be analytical and clear.

## Input:

- **Ticker**: ${ticker}
- **Post-earnings price movement**: ${priceMovement}%
- **Insider activity (last 3 months)**: $${insiderBuys}M buys, $${insiderSells}M sells
- **P/E ratio**: ${peRatio || 'N/A'}
- **Industry avg P/E**: ${industryPE || 'N/A'}
- **Analyst ratings**: ${analystRatings?.buy || 0} Buy, ${analystRatings?.hold || 0} Hold, ${analystRatings?.sell || 0} Sell
- **Price target**: $${priceTarget || 'N/A'}
- **Current price**: $${currentPrice}

## Output format:

Status: **Buy** | **Hold** | **Sell**

Reason: {2–3 sentence analysis based on the data above}`;
}

/**
 * Parses the AI response to extract structured data
 * @param {string} aiResponse - Raw AI response
 * @returns {Object} Parsed response with status and reason
 */
function parseAIResponse(aiResponse) {
  // Extract status (Buy, Hold, or Sell)
  const statusMatch = aiResponse.match(/Status:\s*\*\*(Buy|Hold|Sell)\*\*/i);
  const status = statusMatch ? statusMatch[1] : 'Hold';
  
  // Extract reason
  const reasonMatch = aiResponse.match(/Reason:\s*(.+)/s);
  const reason = reasonMatch ? reasonMatch[1].trim() : aiResponse;
  
  return {
    status,
    reason
  };
}

/**
 * Validates stock data before sending to AI
 * @param {Object} stockData - Stock data to validate
 * @returns {Object} Validation result
 */
function validateStockData(stockData) {
  const errors = [];
  
  if (!stockData.ticker) {
    errors.push('Ticker is required');
  }
  
  if (stockData.ticker && !/^[A-Z]{1,5}$/.test(stockData.ticker)) {
    errors.push('Ticker must be 1-5 uppercase letters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  analyzeStock,
  validateStockData,
  buildAnalysisPrompt,
  parseAIResponse
}; 