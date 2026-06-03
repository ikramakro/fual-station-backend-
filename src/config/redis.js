import Redis from 'ioredis';
import { env } from './env.js';

let redisClient = null;

export function getRedis() {
  if (!redisClient) {
    redisClient = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 3,
    });
    redisClient.on('error', (err) => console.error('Redis error:', err.message));
  }
  return redisClient;
}

export async function connectRedis() {
  const client = getRedis();
  await client.ping();
  console.log('Redis connected');
}

export const SESSION_PREFIX = 'session:';
