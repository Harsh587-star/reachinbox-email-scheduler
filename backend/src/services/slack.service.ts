import axios from "axios";
import { config } from "../config/env.js";
import { prisma } from "../prisma/client.js";

export async function sendRateLimitSlackAlert(params: {
  senderEmail: string;
  senderName: string;
  hourlyLimit: number;
  currentCount: number;
  rescheduledTo: Date;
  affectedRecipient: string;
  affectedSubject: string;
}) {
  try {
    // 1. Get Slack configuration from DB or env
    let webhookUrl = config.slackWebhookUrl;
    const slackIntegration = await prisma.slackIntegration.findFirst({
      where: { isConnected: true },
    });

    if (slackIntegration && slackIntegration.webhookUrl) {
      webhookUrl = slackIntegration.webhookUrl;
    }

    // 2. Log in RateLimitLog table
    await prisma.rateLimitLog.create({
      data: {
        senderEmail: params.senderEmail,
        limit: params.hourlyLimit,
        currentCount: params.currentCount,
        windowKey: new Date().toISOString().substring(0, 13),
        slackNotified: !!webhookUrl,
      },
    });

    if (!webhookUrl) {
      console.log(`[Slack] Rate limit reached for ${params.senderEmail} (${params.currentCount}/${params.hourlyLimit}). No Slack webhook connected.`);
      return { sent: false, reason: "No webhook configured" };
    }

    // 3. Send Slack Block Kit Message
    const payload = {
      text: `🚨 Rate Limit Alert: Sender ${params.senderEmail} exceeded hourly limit!`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 ReachInbox Rate Limit Triggered",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Sender:*\n${params.senderName} (<${params.senderEmail}>)`,
            },
            {
              type: "mrkdwn",
              text: `*Hourly Limit:*\n${params.hourlyLimit} emails/hr (Current: *${params.currentCount}*)`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Action Taken:* Email to \`${params.affectedRecipient}\` with subject "${params.affectedSubject}" has been automatically *rescheduled* to preserve order.\n⏰ *Next Available Window:* \`${params.rescheduledTo.toUTCString()}\``,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `⚡ ReachInbox BullMQ Resilience Scheduler • Timestamp: ${new Date().toISOString()}`,
            },
          ],
        },
      ],
    };

    await axios.post(webhookUrl, payload, { timeout: 4000 });
    console.log(`[Slack] Live rate limit alert delivered successfully for sender: ${params.senderEmail}`);
    return { sent: true };
  } catch (error: any) {
    console.error(`[Slack] Failed to send webhook alert:`, error.message);
    return { sent: false, error: error.message };
  }
}
