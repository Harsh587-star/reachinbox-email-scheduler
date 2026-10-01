import express from "express";
import cors from "cors";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";

import { config } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { getEmailQueue } from "./queues/email.queue.js";
import { startEmailWorker } from "./queues/email.worker.js";
import { reconcilePendingJobsOnBoot } from "./queues/resilience.js";
import { initElasticsearchIndex } from "./services/elasticsearch.service.js";

const app = express();

// Middlewares
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Bull-Board UI Setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

const queue = getEmailQueue();
createBullBoard({
  queues: [new BullMQAdapter(queue)],
  serverAdapter: serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

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
    // 1. Initialize Elasticsearch index if available
    await initElasticsearchIndex();

    // 2. Start BullMQ Background Worker
    startEmailWorker();

    // 3. Reconcile pending jobs on boot for crash & restart resilience
    await reconcilePendingJobsOnBoot();

    // 4. Start HTTP Server
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
