import { Router } from "express";
import { getDashboardAnalytics } from "../controllers/analytics.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware);
router.get("/stats", getDashboardAnalytics);

export default router;
