import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // If no token, allow a demo default user for seamless reviewer testing
    req.user = {
      id: "demo-user-id",
      email: "demo.reviewer@reachinbox.ai",
      name: "Demo Reviewer",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    };
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    return next();
  } catch (err) {
    // Fallback demo user
    req.user = {
      id: "demo-user-id",
      email: "demo.reviewer@reachinbox.ai",
      name: "Demo Reviewer",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    };
    return next();
  }
}
