import { Request, Response } from "express";
import axios from "axios";
import { prisma } from "../prisma/client.js";
import { config } from "../config/env.js";

export async function getSlackStatus(req: Request, res: Response) {
  try {
    let integration = await prisma.slackIntegration.findFirst();
    if (!integration) {
      integration = await prisma.slackIntegration.create({
        data: {
          id: "default-slack",
          isConnected: !!config.slackWebhookUrl,
          webhookUrl: config.slackWebhookUrl || null,
        },
      });
    }

    return res.json({
      isConnected: integration.isConnected,
      webhookUrl: integration.webhookUrl ? `${integration.webhookUrl.substring(0, 30)}...` : null,
      teamName: integration.teamName || "Workspace",
      channel: integration.channel || "#alerts",
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to get Slack status", details: error.message });
  }
}

export async function connectSlackWebhook(req: Request, res: Response) {
  try {
    const { webhookUrl, channel, teamName } = req.body;

    if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
      return res.status(400).json({ error: "Please provide a valid Slack Webhook URL (starts with https://hooks.slack.com/)" });
    }

    const integration = await prisma.slackIntegration.upsert({
      where: { id: "default-slack" },
      update: {
        webhookUrl,
        channel: channel || "#general",
        teamName: teamName || "My Slack Workspace",
        isConnected: true,
      },
      create: {
        id: "default-slack",
        webhookUrl,
        channel: channel || "#general",
        teamName: teamName || "My Slack Workspace",
        isConnected: true,
      },
    });

    return res.json({
      success: true,
      message: "Slack connected successfully!",
      integration,
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to connect Slack", details: error.message });
  }
}

export async function disconnectSlack(req: Request, res: Response) {
  try {
    await prisma.slackIntegration.updateMany({
      data: {
        isConnected: false,
        webhookUrl: null,
      },
    });

    return res.json({ success: true, message: "Slack disconnected successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to disconnect Slack", details: error.message });
  }
}

export async function sendTestSlackAlert(req: Request, res: Response) {
  try {
    const integration = await prisma.slackIntegration.findFirst({
      where: { isConnected: true },
    });

    const webhookUrl = integration?.webhookUrl || config.slackWebhookUrl;

    if (!webhookUrl) {
      return res.status(400).json({ error: "Slack is not connected. Please connect a webhook first." });
    }

    const payload = {
      text: "⚡ ReachInbox Test Notification: Rate Limit alert channel successfully verified!",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "✅ ReachInbox Slack Integration Verified",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Your Slack webhook is connected and ready. You will receive live alerts whenever an email sender hits their hourly quota!`,
          },
        },
      ],
    };

    await axios.post(webhookUrl, payload, { timeout: 4000 });

    return res.json({ success: true, message: "Test alert dispatched to Slack!" });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to dispatch test Slack alert", details: error.message });
  }
}
