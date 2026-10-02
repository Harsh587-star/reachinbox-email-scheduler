import { Request, Response } from "express";
import { prisma } from "../prisma/client.js";
import { scheduleEmailJob, getEmailQueue } from "../queues/email.queue.js";
import { indexEmailInElasticsearch, searchEmails } from "../services/elasticsearch.service.js";

// Helper regex to extract emails
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export async function parseEmailsFromTextOrFile(req: Request, res: Response) {
  try {
    let rawText = "";

    if (req.file) {
      rawText = req.file.buffer.toString("utf-8");
    } else if (req.body && req.body.text) {
      rawText = req.body.text;
    } else {
      return res.status(400).json({ error: "No CSV, text, or file provided" });
    }

    const matches = rawText.match(EMAIL_REGEX) || [];
    // Deduplicate and trim
    const uniqueEmails = Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));

    return res.json({
      count: uniqueEmails.length,
      emails: uniqueEmails,
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to parse emails", details: error.message });
  }
}

export async function scheduleEmails(req: Request, res: Response) {
  try {
    const {
      senderId,
      recipients,
      subject,
      body,
      scheduledAt,
      delaySeconds = 2,
      hourlyLimit,
    } = req.body;

    if (!senderId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "Sender and at least one recipient are required" });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: "Subject and body are required" });
    }

    const sender = await prisma.sender.findUnique({ where: { id: senderId } });
    if (!sender) {
      return res.status(404).json({ error: "Selected sender not found" });
    }

    const targetDate = scheduledAt ? new Date(scheduledAt) : new Date();
    const batchId = `batch_${Date.now()}`;
    const effectiveLimit = hourlyLimit ? parseInt(hourlyLimit, 10) : sender.hourlyLimit;
    const effectiveDelay = parseInt(delaySeconds, 10) || 2;

    const createdJobs = [];

    // Create DB records & BullMQ jobs for each recipient
    for (let i = 0; i < recipients.length; i++) {
      const recipientEmail = recipients[i].trim();
      if (!recipientEmail) continue;

      // Stagger slightly if multiple in batch to respect email spacing
      const staggeredScheduledTime = new Date(targetDate.getTime() + i * (effectiveDelay * 1000));

      const emailRecord = await prisma.emailJob.create({
        data: {
          senderId: sender.id,
          recipientEmail,
          subject,
          body,
          status: "SCHEDULED",
          scheduledAt: staggeredScheduledTime,
          delaySeconds: effectiveDelay,
          hourlyLimitAtSchedule: effectiveLimit,
          batchId,
        },
      });

      // Index in Elasticsearch
      await indexEmailInElasticsearch({
        id: emailRecord.id,
        senderEmail: sender.email,
        recipientEmail: emailRecord.recipientEmail,
        subject: emailRecord.subject,
        body: emailRecord.body,
        status: "SCHEDULED",
        scheduledAt: emailRecord.scheduledAt,
        createdAt: emailRecord.createdAt,
      });

      // Queue in BullMQ
      const bullmqJobId = await scheduleEmailJob({
        emailId: emailRecord.id,
        senderId: sender.id,
        recipientEmail: emailRecord.recipientEmail,
        subject: emailRecord.subject,
        body: emailRecord.body,
        delaySeconds: effectiveDelay,
        scheduledAt: staggeredScheduledTime.toISOString(),
        hourlyLimit: effectiveLimit,
      });

      await prisma.emailJob.update({
        where: { id: emailRecord.id },
        data: { bullmqJobId },
      });

      createdJobs.push({
        id: emailRecord.id,
        recipientEmail,
        scheduledAt: staggeredScheduledTime,
        status: "SCHEDULED",
      });
    }

    return res.status(201).json({
      success: true,
      message: `Successfully scheduled ${createdJobs.length} emails`,
      batchId,
      scheduledCount: createdJobs.length,
      jobs: createdJobs,
    });
  } catch (error: any) {
    console.error("Error scheduling emails:", error);
    return res.status(500).json({ error: "Failed to schedule emails", details: error.message });
  }
}

export async function getScheduledEmails(req: Request, res: Response) {
  try {
    const { query = "", page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;

    if ((query as string).trim().length > 0) {
      const searchRes = await searchEmails(query as string, "SCHEDULED", pageNum, limitNum);
      return res.json(searchRes);
    }

    const where = {
      status: { in: ["SCHEDULED", "RESCHEDULED", "QUEUED", "SENDING"] },
    };

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        include: { sender: true },
        orderBy: { scheduledAt: "asc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    return res.json({
      total,
      page: pageNum,
      limit: limitNum,
      emails: emails.map((e) => ({
        id: e.id,
        recipientEmail: e.recipientEmail,
        subject: e.subject,
        body: e.body,
        status: e.status,
        scheduledAt: e.scheduledAt,
        delaySeconds: e.delaySeconds,
        senderEmail: e.sender.email,
        senderName: e.sender.name,
        failureReason: e.failureReason,
        createdAt: e.createdAt,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to fetch scheduled emails", details: error.message });
  }
}

export async function getSentEmails(req: Request, res: Response) {
  try {
    const { query = "", page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;

    if ((query as string).trim().length > 0) {
      const searchRes = await searchEmails(query as string, "SENT", pageNum, limitNum);
      return res.json(searchRes);
    }

    const where = {
      status: { in: ["SENT", "FAILED"] },
    };

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        include: { sender: true },
        orderBy: { sentAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    return res.json({
      total,
      page: pageNum,
      limit: limitNum,
      emails: emails.map((e) => ({
        id: e.id,
        recipientEmail: e.recipientEmail,
        subject: e.subject,
        body: e.body,
        status: e.status,
        scheduledAt: e.scheduledAt,
        sentAt: e.sentAt,
        senderEmail: e.sender.email,
        senderName: e.sender.name,
        failureReason: e.failureReason,
        etherealPreviewUrl: e.etherealPreviewUrl,
        etherealMessageId: e.etherealMessageId,
        createdAt: e.createdAt,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to fetch sent emails", details: error.message });
  }
}

export async function cancelEmail(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    const email = await prisma.emailJob.findUnique({ where: { id } });
    if (!email) {
      return res.status(404).json({ error: "Email not found" });
    }

    if (email.status === "SENT") {
      return res.status(400).json({ error: "Cannot cancel already sent email" });
    }

    // Remove from BullMQ queue if jobId exists
    if (email.bullmqJobId) {
      try {
        const queue = getEmailQueue();
        const job = await queue.getJob(email.bullmqJobId);
        if (job) {
          await job.remove();
        }
      } catch (e) {
        console.warn("Could not remove job from BullMQ:", (e as Error).message);
      }
    }

    await prisma.emailJob.delete({ where: { id } });

    return res.json({ success: true, message: "Email job cancelled and removed" });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to cancel email", details: error.message });
  }
}
