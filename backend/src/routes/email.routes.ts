import { Router } from "express";
import multer from "multer";
import {
  scheduleEmails,
  parseEmailsFromTextOrFile,
  getScheduledEmails,
  getSentEmails,
  cancelEmail,
} from "../controllers/email.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.use(authMiddleware);

router.post("/schedule", scheduleEmails);
router.post("/parse-csv", upload.single("file"), parseEmailsFromTextOrFile);
router.get("/scheduled", getScheduledEmails);
router.get("/sent", getSentEmails);
router.delete("/:id", cancelEmail);

export default router;
