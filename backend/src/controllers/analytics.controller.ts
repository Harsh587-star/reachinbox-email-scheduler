import { Request, Response } from "express";
import { prisma } from "../prisma/client.js";
import { getQueueMetrics } from "../queues/email.queue.js";

export async function getDashboardAnalytics(req: Request, res: Response) {
  try {
    const [
      queueStats,
      totalScheduled,
      totalSent,
      totalFailed,
      totalRescheduled,
      activeSendersCount,
      rateLimitEvents,
    ] = await Promise.all([
      getQueueMetrics(),
      prisma.emailJob.count({ where: { status: "SCHEDULED" } }),
      prisma.emailJob.count({ where: { status: "SENT" } }),
      prisma.emailJob.count({ where: { status: "FAILED" } }),
      prisma.emailJob.count({ where: { status: "RESCHEDULED" } }),
      prisma.sender.count({ where: { isActive: true } }),
      prisma.rateLimitLog.findMany({
        orderBy: { triggeredAt: "desc" },
        take: 10,
      }),
    ]);

    return res.json({
      queue: queueStats,
      counts: {
        scheduled: totalScheduled,
        sent: totalSent,
        failed: totalFailed,
        rescheduled: totalRescheduled,
        activeSenders: activeSendersCount,
      },
      recentRateLimitEvents: rateLimitEvents,
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to fetch analytics", details: error.message });
  }
}
