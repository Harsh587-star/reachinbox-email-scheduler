import Redis, { RedisOptions } from "ioredis";
import net from "net";
import { config } from "../config/env.js";

let redisClient: Redis | null = null;
let redisMemoryServer: any = null;
let redisOptions: RedisOptions = {};

async function isRedisPortOpen(host: string, port: number, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      status = true;
      socket.destroy();
    });

    socket.on("timeout", () => {
      socket.destroy();
    });

    socket.on("error", () => {
      socket.destroy();
    });

    socket.on("close", () => {
      resolve(status);
    });

    socket.connect(port, host);
  });
}

export async function initRedis(): Promise<Redis> {
  if (redisClient) return redisClient;

  // Managed Redis via URL (Upstash / Render / Redis Cloud). rediss:// enables TLS automatically.
  if (config.redisUrl) {
    console.log("[Redis] Connecting using REDIS_URL");
    redisOptions = {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
    redisClient = new Redis(config.redisUrl, redisOptions);
    redisClient.on("error", (err) => {
      console.error("[Redis Error]", err.message);
    });
    return redisClient;
  }

  const targetHost = config.redisHost || "127.0.0.1";
  const targetPort = config.redisPort || 6379;

  const isExternalAvailable = await isRedisPortOpen(targetHost, targetPort);

  if (isExternalAvailable) {
    console.log(`[Redis] Connecting to external Redis at ${targetHost}:${targetPort}`);
    redisOptions = {
      host: targetHost,
      port: targetPort,
      password: config.redisPassword || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
    redisClient = new Redis(redisOptions);
  } else {
    console.log("⚠️ External Redis not found. Booting isolated in-memory Redis server...");
    const { RedisMemoryServer } = await import("redis-memory-server");
    redisMemoryServer = new RedisMemoryServer();
    const host = await redisMemoryServer.getHost();
    const port = await redisMemoryServer.getPort();
    console.log(`🚀 [Redis] In-memory Redis server running at ${host}:${port}`);

    redisOptions = {
      host,
      port,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
    redisClient = new Redis(redisOptions);
  }

  redisClient.on("error", (err) => {
    console.error("[Redis Error]", err.message);
  });

  return redisClient;
}

export function getRedisConnection(): Redis {
  if (!redisClient) {
    // Synchronous fallback if called before initRedis finishes
        if (config.redisUrl) {
      redisOptions = { maxRetriesPerRequest: null, enableReadyCheck: false };
      redisClient = new Redis(config.redisUrl, redisOptions);
      return redisClient;
    }
    const targetHost = config.redisHost || "127.0.0.1";
    const targetPort = config.redisPort || 6379;
    redisOptions = {
      host: targetHost,
      port: targetPort,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
    redisClient = new Redis(redisOptions);
  }
  return redisClient;
}

export function getRedisOptions(): RedisOptions {
  if (!redisClient) {
    getRedisConnection();
  }
  return redisOptions;
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
