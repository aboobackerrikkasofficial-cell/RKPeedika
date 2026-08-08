import Redis from 'ioredis';
import logger from '../utils/logger.js';

let activeRedisClient;

// Sandbox fallback mock cache
const mockCache = new Map();
const mockRedis = {
  get: async (key) => mockCache.get(key) || null,
  set: async (key, val, mode, duration) => {
    mockCache.set(key, val);
    if (mode === 'EX' && duration) {
      setTimeout(() => mockCache.delete(key), duration * 1000);
    }
    return 'OK';
  },
  del: async (key) => {
    const deleted = mockCache.delete(key);
    return deleted ? 1 : 0;
  },
  keys: async (pattern) => {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return Array.from(mockCache.keys()).filter(key => regex.test(key));
  }
};

try {
  if (process.env.REDIS_URL) {
    const realRedis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true
    });
    
    activeRedisClient = realRedis;
    
    realRedis.on('error', (err) => {
      logger.warn(`Redis failed to connect: ${err.message}. Defaulting to Sandbox Mock Cache.`);
      activeRedisClient = mockRedis;
    });

    realRedis.on('connect', () => {
      logger.info('🚀 Redis caching connection successfully active.');
    });

    await realRedis.connect().catch((err) => {
      logger.warn(`Redis initial connect failed: ${err.message}. Defaulting to Sandbox Mock Cache.`);
      activeRedisClient = mockRedis;
    });
  } else {
    logger.info('Redis URL not specified in env. Active Cache: Sandbox Mock Memory.');
    activeRedisClient = mockRedis;
  }
} catch (error) {
  logger.warn(`Redis initialization error. Using Sandbox Mock Memory: ${error.message}`);
  activeRedisClient = mockRedis;
}

// Export a proxy object to avoid stale references in modules that import it
const redisClient = {
  get: async (key) => activeRedisClient.get(key),
  set: async (key, val, mode, duration) => {
    if (activeRedisClient === mockRedis) {
      return mockRedis.set(key, val, mode, duration);
    }
    if (mode === 'EX' && duration) {
      return activeRedisClient.set(key, val, 'EX', duration);
    }
    return activeRedisClient.set(key, val);
  },
  del: async (key) => activeRedisClient.del(key),
  keys: async (pattern) => activeRedisClient.keys(pattern)
};

export default redisClient;
