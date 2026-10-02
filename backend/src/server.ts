import express from "express";
import cors from "cors";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { config } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { initRedis } from "./services/redis.service.js";
import { getEmailQueue } from "./queues/email.queue.js";
import { startEmailWorker } from "./queues/email.worker.js";
import { reconcilePendingJobsOnBoot } from "./queues/resilience.js";
import { initElasticsearchIndex } from "./services/elasticsearch.service.js";

const app = express();

// Middlewares
const allowedOrigin = config.frontendUrl.replace(/\/+$/, "");
app.use(
  cors({
    origin: config.nodeEnv === "production" ? [allowedOrigin, "http://localhost:3000"] : "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// REST API Routes
app.use("/api", apiRouter);

// Root route
app.get("/", (req, res) => {
  res.json({
    name: "ReachInbox Email Scheduler API",
    version: "1.0.0",
    docs: "/api/health",
    bullBoardUI: "/admin/queues",
  });
});

async function bootstrap() {
  try {
    // 1. Initialize Redis (External or In-Memory MemoryServer)
    await initRedis();

    // 2. Setup Bull-Board UI with initialized Queue
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/admin/queues");

    const queue = getEmailQueue();
    createBullBoard({
      queues: [new BullMQAdapter(queue)],
      serverAdapter: serverAdapter,
    });

    app.use("/admin/queues", serverAdapter.getRouter());

    // 3. Initialize Elasticsearch index if available
    await initElasticsearchIndex();

    // 4. Start BullMQ Background Worker
    startEmailWorker();

    // 5. Reconcile pending jobs on boot for crash & restart resilience
    await reconcilePendingJobsOnBoot();

    // 6. Start HTTP Server
    app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`🚀 ReachInbox Email Scheduler running on port ${config.port}`);
      console.log(`📊 Bull-Board Live Queue Dashboard: http://localhost:${config.port}/admin/queues`);
      console.log(`🔗 API Base: http://localhost:${config.port}/api`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error("Fatal startup error:", error);
    process.exit(1);
  }
}

bootstrap();
