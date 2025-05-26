// utils/cache.js
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET;
let cachingEnabled = false; // Default to disabled

// Only enable caching if bucket name is provided
if (bucketName) {
  console.log(`[INFO] Using Google Cloud Storage bucket: ${bucketName}`);
  cachingEnabled = true;
  
  // Check if bucket exists on startup
  async function checkBucketExists() {
    try {
      const bucket = storage.bucket(bucketName);
      const [exists] = await bucket.exists();
      if (exists) {
        console.log(`[INFO] Google Cloud Storage bucket ${bucketName} is accessible`);
      } else {
        console.warn(`[WARN] Google Cloud Storage bucket ${bucketName} does not exist. Caching disabled.`);
        cachingEnabled = false;
      }
    } catch (err) {
      console.warn(`[WARN] Google Cloud Storage bucket ${bucketName} is not accessible. Caching disabled.`, {
        message: err.message,
        code: err.code
      });
      cachingEnabled = false;
    }
  }
  
  // Check bucket on module load
  checkBucketExists();
} else {
  console.log(`[INFO] No GCS_BUCKET environment variable set. Caching disabled.`);
}

async function readCache(file, maxAge) {
  if (!cachingEnabled || !bucketName) {
    console.log(`[DEBUG] Caching disabled, skipping cache read for ${file}`);
    return null;
  }

  try {
    console.log(`[DEBUG] Reading cache from bucket: ${bucketName}, file: ${file}.json`);
    const bucket = storage.bucket(bucketName);
    const fileObj = bucket.file(`${file}.json`);
    const [data] = await fileObj.download();
    const cache = JSON.parse(data.toString());
    if (Date.now() - cache.timestamp < maxAge) {
      console.log(`[DEBUG] Cache hit for ${file}`);
      return cache.data;
    } else {
      console.log(`[DEBUG] Cache expired for ${file}`);
    }
  } catch (err) {
    // Only log as debug for missing files (normal case), error for other issues
    if (err.code === 404) {
      console.log(`[DEBUG] Cache file ${file}.json not found (normal for first run or expired cache)`);
    } else {
      console.error(`[ERROR] Cache read failed for ${file} from bucket ${bucketName}:`, {
        message: err.message,
        code: err.code,
        bucketName: bucketName
      });
      
      // Only disable caching for bucket-level errors, not file-level 404s
      if (err.code === 403 || (err.code === 404 && err.message.includes('bucket'))) {
        console.warn(`[WARN] Disabling caching due to bucket access issue`);
        cachingEnabled = false;
      }
    }
  }
  return null;
}

async function writeCache(file, data) {
  if (!cachingEnabled || !bucketName) {
    console.log(`[DEBUG] Caching disabled, skipping cache write for ${file}`);
    return;
  }

  try {
    console.log(`[DEBUG] Writing cache to bucket: ${bucketName}, file: ${file}.json`);
    const bucket = storage.bucket(bucketName);
    const fileObj = bucket.file(`${file}.json`);
    const cache = { data, timestamp: Date.now() };
    await fileObj.save(JSON.stringify(cache));
    console.log(`[DEBUG] Cache write successful for ${file}`);
  } catch (err) {
    console.error(`[ERROR] Cache write failed for ${file} to bucket ${bucketName}:`, {
      error: err,
      bucketName: bucketName,
      fileName: `${file}.json`
    });
    
    // Only disable caching for bucket-level errors
    if (err.code === 403 || (err.code === 404 && err.message.includes('bucket'))) {
      console.warn(`[WARN] Disabling caching due to bucket access issue`);
      cachingEnabled = false;
    }
  }
}

async function loadCacheFile(file) {
  if (!cachingEnabled || !bucketName) {
    console.log(`[DEBUG] Caching disabled, returning empty object for ${file}`);
    return {};
  }

  try {
    console.log(`[DEBUG] Loading cache file from bucket: ${bucketName}, file: ${file}`);
    const bucket = storage.bucket(bucketName);
    const fileObj = bucket.file(file);
    const [data] = await fileObj.download();
    console.log(`[DEBUG] Cache file load successful for ${file}`);
    return JSON.parse(data.toString());
  } catch (err) {
    // Only log as debug for missing files (normal case), error for other issues
    if (err.code === 404) {
      console.log(`[DEBUG] Cache file ${file} not found (normal for first run)`);
    } else {
      console.error(`[ERROR] Cache file load failed for ${file} from bucket ${bucketName}:`, {
        message: err.message,
        code: err.code,
        bucketName: bucketName
      });
      
      // Only disable caching for bucket-level errors
      if (err.code === 403 || (err.code === 404 && err.message.includes('bucket'))) {
        console.warn(`[WARN] Disabling caching due to bucket access issue`);
        cachingEnabled = false;
      }
    }
    
    return {};
  }
}

async function saveCacheFile(file, data) {
  if (!cachingEnabled || !bucketName) {
    console.log(`[DEBUG] Caching disabled, skipping cache file save for ${file}`);
    return;
  }

  try {
    console.log(`[DEBUG] Saving cache file to bucket: ${bucketName}, file: ${file}`);
    const bucket = storage.bucket(bucketName);
    const fileObj = bucket.file(file);
    await fileObj.save(JSON.stringify(data));
    console.log(`[DEBUG] Cache file save successful for ${file}`);
  } catch (err) {
    console.error(`[ERROR] Cache file save failed for ${file} to bucket ${bucketName}:`, {
      error: err,
      bucketName: bucketName,
      fileName: file
    });
    
    // Only disable caching for bucket-level errors
    if (err.code === 403 || (err.code === 404 && err.message.includes('bucket'))) {
      console.warn(`[WARN] Disabling caching due to bucket access issue`);
      cachingEnabled = false;
    }
  }
}

module.exports = { readCache, writeCache, loadCacheFile, saveCacheFile }; 