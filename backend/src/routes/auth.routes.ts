import { Router } from "express";
import { loginOrDemo, getMe } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/login", loginOrDemo);
router.post("/google", loginOrDemo);
router.get("/me", authMiddleware, getMe);

export default router;
