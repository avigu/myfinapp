// utils/cache.js
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = 'myfinapp-cache';

async function readCache(file, maxAge) {
  try {
    const bucket = storage.bucket(bucketName);
    const fileObj = bucket.file(`${file}.json`);
    const [data] = await fileObj.download();
    const cache = JSON.parse(data.toString());
    if (Date.now() - cache.timestamp < maxAge) {
      return cache.data;
    }
  } catch (err) {
    console.error(`[ERROR] Cache read failed for ${file}:`, err.message);
  }
  return null;
}

async function writeCache(file, data) {
  try {
    const bucket = storage.bucket(bucketName);
    const fileObj = bucket.file(`${file}.json`);
    const cache = { data, timestamp: Date.now() };
    await fileObj.save(JSON.stringify(cache));
  } catch (err) {
    console.error(`[ERROR] Cache write failed for ${file}:`, err.message);
  }
}

async function loadCacheFile(file) {
  try {
    const bucket = storage.bucket(bucketName);
    const fileObj = bucket.file(file);
    const [data] = await fileObj.download();
    return JSON.parse(data.toString());
  } catch (err) {
    console.error(`[ERROR] Cache file load failed for ${file}:`, err.message);
    return {};
  }
}

async function saveCacheFile(file, data) {
  try {
    const bucket = storage.bucket(bucketName);
    const fileObj = bucket.file(file);
    await fileObj.save(JSON.stringify(data));
  } catch (err) {
    console.error(`[ERROR] Cache file save failed for ${file}:`, err.message);
  }
}

module.exports = { readCache, writeCache, loadCacheFile, saveCacheFile }; 