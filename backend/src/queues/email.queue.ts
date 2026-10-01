import { Queue } from "bullmq";
import { getRedisConnection } from "../services/redis.service.js";

export const EMAIL_QUEUE_NAME = "email-scheduler-queue";

export interface EmailJobData {
  emailId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  delaySeconds: number;
  scheduledAt: string; // ISO string
  hourlyLimit: number;
  attemptNumber?: number;
}

let emailQueue: Queue<EmailJobData>;

export function getEmailQueue(): Queue<EmailJobData> {
  if (!emailQueue) {
    const connection = getRedisConnection();
    emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 3600 * 24, // keep completed jobs for 24 hours
          count: 5000,
        },
        removeOnFail: {
          age: 3600 * 24 * 7, // keep failed for 7 days
        },
      },
    });
  }
  return emailQueue;
}

export async function scheduleEmailJob(data: EmailJobData, customDelayMs?: number): Promise<string> {
  const queue = getEmailQueue();
  const targetTime = new Date(data.scheduledAt).getTime();
  const now = Date.now();
  
  let calculatedDelay = customDelayMs !== undefined ? customDelayMs : Math.max(0, targetTime - now);

  const jobId = `email_job_${data.emailId}`;

  // Deterministic JobId ensures Idempotency across restarts and multi-submission
  const job = await queue.add("send-scheduled-email", data, {
    jobId,
    delay: calculatedDelay,
  });

  return job.id || jobId;
}

export async function getQueueMetrics() {
  try {
    const queue = getEmailQueue();
    const [waiting, active, delayed, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      delayed,
      completed,
      failed,
      total: waiting + active + delayed + completed + failed,
    };
  } catch (err) {
    return {
      waiting: 0,
      active: 0,
      delayed: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };
  }
}
