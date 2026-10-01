import { Worker, Job } from "bullmq";
import { config } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { getRedisConnection, getHourWindowKey, incrementHourlyCounter, getHourlyCount, getNextHourWindowDate } from "../services/redis.service.js";
import { sendEmailViaEthereal } from "../services/email.service.js";
import { indexEmailInElasticsearch } from "../services/elasticsearch.service.js";
import { sendRateLimitSlackAlert } from "../services/slack.service.js";
import { EMAIL_QUEUE_NAME, EmailJobData, scheduleEmailJob } from "./email.queue.js";

let emailWorker: Worker<EmailJobData> | null = null;

export function startEmailWorker(): Worker<EmailJobData> {
  if (emailWorker) return emailWorker;

  const connection = getRedisConnection();

  emailWorker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, senderId, recipientEmail, subject, body, delaySeconds } = job.data;
      console.log(`[Worker] Processing Job ${job.id} for recipient: ${recipientEmail}`);

      // 1. Fetch Sender & Email Job from DB
      const [sender, emailRecord] = await Promise.all([
        prisma.sender.findUnique({ where: { id: senderId } }),
        prisma.emailJob.findUnique({ where: { id: emailId } }),
      ]);

      if (!sender || !sender.isActive) {
        throw new Error(`Sender ${senderId} not found or inactive`);
      }

      if (!emailRecord) {
        throw new Error(`Email record ${emailId} not found in database`);
      }

      // 2. Enforce Hourly Rate Limiting (Redis-backed counter across instances)
      const currentHourKey = getHourWindowKey(new Date());
      const currentCount = await getHourlyCount(sender.email, currentHourKey);
      const limit = sender.hourlyLimit || config.maxEmailsPerHour;

      if (currentCount >= limit) {
        console.warn(`[Worker] Rate limit reached for ${sender.email} (${currentCount}/${limit}). Rescheduling...`);

        const nextHourDate = await getNextHourWindowDate(new Date());
        const rescheduleDelayMs = Math.max(1000, nextHourDate.getTime() - Date.now());

        // Update DB status to RESCHEDULED
        await prisma.emailJob.update({
          where: { id: emailId },
          data: {
            status: "RESCHEDULED",
            scheduledAt: nextHourDate,
            failureReason: `Rate limit (${limit}/hr) reached. Rescheduled to next hour window.`,
          },
        });

        // Trigger Slack Alert (Live notification on rate limit)
        await sendRateLimitSlackAlert({
          senderEmail: sender.email,
          senderName: sender.name,
          hourlyLimit: limit,
          currentCount: currentCount,
          rescheduledTo: nextHourDate,
          affectedRecipient: recipientEmail,
          affectedSubject: subject,
        });

        // Re-schedule with new delay to preserve order in next window
        await scheduleEmailJob(
          {
            ...job.data,
            scheduledAt: nextHourDate.toISOString(),
          },
          rescheduleDelayMs
        );

        return {
          status: "RESCHEDULED",
          reason: "RATE_LIMIT_EXCEEDED",
          rescheduledTo: nextHourDate.toISOString(),
        };
      }

      // Increment hourly counter
      const updatedCount = await incrementHourlyCounter(sender.email, currentHourKey);

      // Check if this send just reached the limit to alert the user
      if (updatedCount === limit) {
        const nextHourDate = await getNextHourWindowDate(new Date());
        sendRateLimitSlackAlert({
          senderEmail: sender.email,
          senderName: sender.name,
          hourlyLimit: limit,
          currentCount: updatedCount,
          rescheduledTo: nextHourDate,
          affectedRecipient: recipientEmail,
          affectedSubject: subject,
        }).catch((e) => console.error("Slack alert error:", e));
      }

      // 3. Throttle Delay Between Emails (config or per-campaign delay)
      const throttleMs = Math.max(
        config.minDelayBetweenEmailsMs,
        (delaySeconds || config.minDelayBetweenEmailsMs / 1000) * 1000
      );

      if (throttleMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, throttleMs));
      }

      // 4. Update Status to SENDING
      await prisma.emailJob.update({
        where: { id: emailId },
        data: { status: "SENDING" },
      });

      // 5. Send via Ethereal SMTP
      const sendResult = await sendEmailViaEthereal({
        fromName: sender.name,
        fromEmail: sender.email,
        toEmail: recipientEmail,
        subject: subject,
        bodyHtml: body,
        etherealUser: sender.etherealUser,
        etherealPass: sender.etherealPass,
      });

      if (!sendResult.success) {
        // Record failure
        const failedEmail = await prisma.emailJob.update({
          where: { id: emailId },
          data: {
            status: "FAILED",
            failureReason: sendResult.error,
            retryCount: { increment: 1 },
          },
          include: { sender: true },
        });

        // Index in Elasticsearch
        await indexEmailInElasticsearch({
          id: failedEmail.id,
          senderEmail: sender.email,
          recipientEmail: failedEmail.recipientEmail,
          subject: failedEmail.subject,
          body: failedEmail.body,
          status: "FAILED",
          scheduledAt: failedEmail.scheduledAt,
          sentAt: null,
          createdAt: failedEmail.createdAt,
          etherealPreviewUrl: null,
        });

        throw new Error(sendResult.error || "Email delivery failed");
      }

      // 6. Record Success
      const sentTime = new Date();
      const updatedEmail = await prisma.emailJob.update({
        where: { id: emailId },
        data: {
          status: "SENT",
          sentAt: sentTime,
          etherealMessageId: sendResult.messageId,
          etherealPreviewUrl: sendResult.previewUrl,
          failureReason: null,
        },
        include: { sender: true },
      });

      console.log(`[Worker] Email ${emailId} successfully sent! Preview URL: ${sendResult.previewUrl}`);

      // 7. Index in Elasticsearch
      await indexEmailInElasticsearch({
        id: updatedEmail.id,
        senderEmail: sender.email,
        recipientEmail: updatedEmail.recipientEmail,
        subject: updatedEmail.subject,
        body: updatedEmail.body,
        status: "SENT",
        scheduledAt: updatedEmail.scheduledAt,
        sentAt: sentTime,
        createdAt: updatedEmail.createdAt,
        etherealPreviewUrl: sendResult.previewUrl,
      });

      return {
        status: "SENT",
        emailId,
        previewUrl: sendResult.previewUrl,
        sentAt: sentTime,
      };
    },
    {
      connection,
      concurrency: config.workerConcurrency,
      limiter: {
        max: 50,
        duration: 1000,
      },
    }
  );

  emailWorker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  emailWorker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });

  console.log(`[Worker] BullMQ Worker started with concurrency = ${config.workerConcurrency}`);
  return emailWorker;
}
