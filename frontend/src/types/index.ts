export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface Sender {
  id: string;
  name: string;
  email: string;
  hourlyLimit: number;
  isActive: boolean;
  etherealUser?: string | null;
  etherealPass?: string | null;
  _count?: {
    emails: number;
  };
}

export interface ScheduledEmail {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: "SCHEDULED" | "RESCHEDULED" | "QUEUED" | "SENDING";
  scheduledAt: string;
  delaySeconds: number;
  senderEmail: string;
  senderName: string;
  failureReason?: string | null;
  createdAt: string;
}

export interface SentEmail {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: "SENT" | "FAILED";
  scheduledAt: string;
  sentAt?: string | null;
  senderEmail: string;
  senderName: string;
  failureReason?: string | null;
  etherealPreviewUrl?: string | null;
  etherealMessageId?: string | null;
  createdAt: string;
}

export interface DashboardStats {
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    completed: number;
    failed: number;
    total: number;
  };
  counts: {
    scheduled: number;
    sent: number;
    failed: number;
    rescheduled: number;
    activeSenders: number;
  };
  recentRateLimitEvents: Array<{
    id: string;
    senderEmail: string;
    limit: number;
    currentCount: number;
    triggeredAt: string;
    slackNotified: boolean;
  }>;
}

export interface SlackStatus {
  isConnected: boolean;
  webhookUrl?: string | null;
  teamName?: string;
  channel?: string;
}
