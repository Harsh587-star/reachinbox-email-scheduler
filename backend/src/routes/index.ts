import { Router } from "express";
import authRoutes from "./auth.routes.js";
import senderRoutes from "./sender.routes.js";
import emailRoutes from "./email.routes.js";
import slackRoutes from "./slack.routes.js";
import analyticsRoutes from "./analytics.routes.js";

const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/senders", senderRoutes);
apiRouter.use("/emails", emailRoutes);
apiRouter.use("/slack", slackRoutes);
apiRouter.use("/analytics", analyticsRoutes);

apiRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "ReachInbox Email Scheduler",
    timestamp: new Date().toISOString(),
  });
});

export default apiRouter;
