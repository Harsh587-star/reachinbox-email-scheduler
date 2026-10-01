import { prisma } from "../prisma/client.js";
import { scheduleEmailJob } from "./email.queue.js";

export async function reconcilePendingJobsOnBoot(): Promise<void> {
  try {
    console.log("[Resilience] Checking for pending/scheduled emails on boot...");

    const pendingEmails = await prisma.emailJob.findMany({
      where: {
        status: { in: ["SCHEDULED", "RESCHEDULED"] },
      },
      include: {
        sender: true,
      },
      orderBy: { scheduledAt: "asc" },
    });

    console.log(`[Resilience] Found ${pendingEmails.length} pending email jobs to verify/enqueue.`);

    let enqueuedCount = 0;
    for (const email of pendingEmails) {
      await scheduleEmailJob({
        emailId: email.id,
        senderId: email.senderId,
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        body: email.body,
        delaySeconds: email.delaySeconds,
        scheduledAt: email.scheduledAt.toISOString(),
        hourlyLimit: email.hourlyLimitAtSchedule,
      });
      enqueuedCount++;
    }

    console.log(`[Resilience] Successfully verified & enqueued ${enqueuedCount} pending jobs.`);
  } catch (error) {
    console.error("[Resilience] Error during startup job reconciliation:", error);
  }
}
