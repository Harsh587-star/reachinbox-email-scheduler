import { Router } from "express";
import { getSenders, createSender, updateSender } from "../controllers/sender.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getSenders);
router.post("/", createSender);
router.put("/:id", updateSender);

export default router;
