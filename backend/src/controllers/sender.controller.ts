import { Request, Response } from "express";
import { prisma } from "../prisma/client.js";

export async function getSenders(req: Request, res: Response) {
  try {
    const senders = await prisma.sender.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            emails: true,
          },
        },
      },
    });

    return res.json({ senders });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to fetch senders", details: error.message });
  }
}

export async function createSender(req: Request, res: Response) {
  try {
    const { name, email, hourlyLimit, etherealUser, etherealPass } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const sender = await prisma.sender.create({
      data: {
        name,
        email,
        hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 100,
        etherealUser: etherealUser || null,
        etherealPass: etherealPass || null,
      },
    });

    return res.status(201).json({ sender });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to create sender", details: error.message });
  }
}

export async function updateSender(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { name, hourlyLimit, isActive } = req.body;

    const sender = await prisma.sender.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        hourlyLimit: hourlyLimit !== undefined ? parseInt(hourlyLimit, 10) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return res.json({ sender });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to update sender", details: error.message });
  }
}
