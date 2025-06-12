const axios = require('axios');

const FMP_API_KEY = process.env.FMP_API_KEY || 'demo';
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

async function fetchFMP(endpoint) {
  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${FMP_API_KEY}`;
  const response = await axios.get(url, { timeout: 30000 });
  return response.data;
}

async function quote(ticker) {
  const data = await fetchFMP(`/quote/${ticker}`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function historical(ticker, fromDate, toDate) {
  const data = await fetchFMP(`/historical-price-full/${ticker}?from=${fromDate}&to=${toDate}`);
  return data && data.historical ? data.historical : [];
}

async function profile(ticker) {
  const data = await fetchFMP(`/profile/${ticker}`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

module.exports = {
  quote,
  historical,
  profile,
  fetchFMP,
};
