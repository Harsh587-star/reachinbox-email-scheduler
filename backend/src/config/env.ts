import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  
  // Redis
  redisHost: process.env.REDIS_HOST || "localhost",
  redisPort: parseInt(process.env.REDIS_PORT || "6379", 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  redisUrl: process.env.REDIS_URL || undefined,

  // Elasticsearch
  elasticsearchNode: process.env.ELASTICSEARCH_NODE || "http://localhost:9200",
  elasticsearchIndex: process.env.ELASTICSEARCH_INDEX || "reachinbox-emails",

  // Queue & Worker Concurrency
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
  minDelayBetweenEmailsMs: parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_MS || "2000", 10),
  maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || "200", 10),

  // Auth
  jwtSecret: process.env.JWT_SECRET || "reachinbox_super_secret_jwt_key_2026",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "mock_google_client_id",

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  // Slack
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  slackClientId: process.env.SLACK_CLIENT_ID || "",
  slackClientSecret: process.env.SLACK_CLIENT_SECRET || "",
  slackRedirectUri: process.env.SLACK_REDIRECT_URI || "http://localhost:5000/api/slack/callback",
};
