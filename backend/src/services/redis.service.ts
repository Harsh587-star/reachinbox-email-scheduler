import Redis from "ioredis";
import RedisMock from "ioredis-mock";
import { config } from "../config/env.js";

let redisClient: Redis;
let isMock = false;

function createRedisConnection(): Redis {
  try {
    if (config.redisUrl) {
      const client = new Redis(config.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
          if (times > 3) return null; // fallback after 3 tries
          return Math.min(times * 100, 1000);
        }
      });
      return client;
    }

    const client = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 2) return null;
        return Math.min(times * 100, 1000);
      }
    });

    client.on("error", (err) => {
      // Handled silently or logged
    });

    return client;
  } catch (error) {
    console.warn("⚠️ Redis direct connection failed, using in-memory mock fallback");
    isMock = true;
    return new RedisMock() as unknown as Redis;
  }
}

export function getRedisConnection(): Redis {
  if (!redisClient) {
    redisClient = createRedisConnection();
  }
  return redisClient;
}

export function createNewRedisClient(): Redis {
  try {
    if (isMock) {
      return new RedisMock() as unknown as Redis;
    }
    return createRedisConnection();
  } catch {
    return new RedisMock() as unknown as Redis;
  }
}

export function getHourWindowKey(date = new Date()): string {
  // Format: YYYY-MM-DD-HH (e.g. 2026-10-01-13)
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${hh}`;
}

export async function incrementHourlyCounter(senderEmail: string, hourKey: string): Promise<number> {
  const redis = getRedisConnection();
  const key = `ratelimit:sender:${senderEmail}:${hourKey}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // Expire after 2 hours (7200s) to keep memory lean
    await redis.expire(key, 7200);
  }
  return count;
}

export async function getHourlyCount(senderEmail: string, hourKey: string): Promise<number> {
  const redis = getRedisConnection();
  const key = `ratelimit:sender:${senderEmail}:${hourKey}`;
  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
}

export async function getNextHourWindowDate(currentDate = new Date()): Promise<Date> {
  const nextHour = new Date(currentDate);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0); // Start of next hour
  return nextHour;
}
