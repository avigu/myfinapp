// utils/cache.js
const { gcsRead, gcsWrite } = require('../gcs');

function getCacheFilePath(name) {
  return name + '.json';
}

async function readCache(name, maxAgeMs) {
  const file = getCacheFilePath(name);
  try {
    const contents = await gcsRead(file);
    if (!contents) return null;
    const { timestamp, data } = JSON.parse(contents);
    if (Date.now() - timestamp < maxAgeMs) return data;
  } catch (err) {
    console.log(`[CACHE] Error reading cache ${file}:`, err.message);
  }
  return null;
}

async function writeCache(name, data) {
  const file = getCacheFilePath(name);
  try {
    await gcsWrite(file, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (err) {
    console.log(`[CACHE] Error writing cache ${file}:`, err.message);
  }
}

async function loadCacheFile(file) {
  try {
    const contents = await gcsRead(file);
    if (contents) return JSON.parse(contents);
  } catch (err) {
    console.log(`[CACHE] Error loading cache file ${file}:`, err.message);
  }
  return {};
}

async function saveCacheFile(file, obj) {
  try {
    await gcsWrite(file, JSON.stringify(obj));
  } catch (err) {
    console.log(`[CACHE] Error saving cache file ${file}:`, err.message);
  }
}

module.exports = {
  getCacheFilePath,
  readCache,
  writeCache,
  loadCacheFile,
  saveCacheFile,
}; 