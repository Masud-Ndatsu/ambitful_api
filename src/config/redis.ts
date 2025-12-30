import Redis from 'ioredis';
import { config } from './envars';

const connString = config.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(connString, {
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
  if (err.message.includes('MaxRetriesPerRequestError')) {
    // Handle or ignore this specific error
  } else {
    console.error('Redis error:', err);
  }
});

export default redis;
