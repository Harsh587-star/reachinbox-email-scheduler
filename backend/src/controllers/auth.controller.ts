import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

export async function loginOrDemo(req: Request, res: Response) {
  try {
    const { email, name, avatar, googleId } = req.body;

    const userEmail = email || "demo.reviewer@reachinbox.ai";
    const userName = name || "Demo Reviewer";
    const userAvatar = avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";

    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        name: userName,
        avatar: userAvatar,
        googleId: googleId || undefined,
      },
      create: {
        email: userEmail,
        name: userName,
        avatar: userAvatar,
        googleId: googleId || undefined,
      },
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Authentication failed", details: error.message });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  return res.json({
    user: req.user,
  });
}
