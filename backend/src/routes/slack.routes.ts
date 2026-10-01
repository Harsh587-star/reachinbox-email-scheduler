import { Router } from "express";
import {
  getSlackStatus,
  connectSlackWebhook,
  disconnectSlack,
  sendTestSlackAlert,
} from "../controllers/slack.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/status", getSlackStatus);
router.post("/connect", connectSlackWebhook);
router.post("/disconnect", disconnectSlack);
router.post("/test", sendTestSlackAlert);

export default router;
