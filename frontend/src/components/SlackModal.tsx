import React, { useState } from "react";
import { X, Bell, CheckCircle2, Send, ExternalLink, ShieldCheck } from "lucide-react";
import { SlackStatus } from "../types/index.ts";
import { slackApi } from "../services/api.ts";
import { useToast } from "../context/ToastContext.tsx";

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SlackStatus | null;
  onStatusUpdated: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusUpdated,
}) => {
  const { showToast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channel, setChannel] = useState("#email-alerts");
  const [teamName, setTeamName] = useState("ReachInbox Workspace");
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl) return;

    setConnecting(true);
    try {
      await slackApi.connect({ webhookUrl, channel, teamName });
      showToast("Slack webhook connected successfully!", "success");
      onStatusUpdated();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to connect Slack webhook", "error");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await slackApi.disconnect();
      showToast("Slack disconnected", "info");
      onStatusUpdated();
    } catch (err: any) {
      showToast("Failed to disconnect Slack", "error");
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    try {
      await slackApi.test();
      showToast("Live test notification sent to Slack!", "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to send test alert", "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="clay-card w-full max-w-lg p-7 relative">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Slack Notifications</h2>
              <p className="text-xs text-slate-500">Live alerts when hourly rate limits are reached</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {status?.isConnected ? (
          <div className="space-y-5">
            <div className="clay-card-flat p-4 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">Slack Is Connected</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Webhook configured for {status.channel} ({status.teamName}). When any sender hits their hourly quota, a live alert will be posted to your channel immediately.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleTestAlert}
                disabled={testing}
                className="w-full clay-button-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{testing ? "Dispatching..." : "Send Test Slack Alert"}</span>
              </button>
              <button
                onClick={handleDisconnect}
                className="w-full clay-button py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="clay-card-soft p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800 mb-1">How rate-limit alerts work:</p>
              <p>
                When multiple jobs hit a sender's hourly limit, BullMQ reschedules the excess emails to the next hour window, and a verifiable notification is dispatched to Slack.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Slack Incoming Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/T.../B.../..."
                required
                className="w-full clay-input px-3.5 py-2.5 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Channel Name</label>
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="#email-alerts"
                  className="w-full clay-input px-3.5 py-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Workspace Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="ReachInbox Team"
                  className="w-full clay-input px-3.5 py-2 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="clay-button px-4 py-2 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={connecting}
                className="clay-button-primary px-6 py-2 text-xs font-bold flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{connecting ? "Connecting..." : "Save & Connect"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
