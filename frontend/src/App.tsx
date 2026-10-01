import React, { useState, useEffect, useCallback } from "react";
import { Search, Clock, Send, Users, RefreshCw, Sparkles, Filter } from "lucide-react";
import { Header } from "./components/Header.tsx";
import { StatsCards } from "./components/StatsCards.tsx";
import { ScheduledTab } from "./components/ScheduledTab.tsx";
import { SentTab } from "./components/SentTab.tsx";
import { SendersTab } from "./components/SendersTab.tsx";
import { ComposeModal } from "./components/ComposeModal.tsx";
import { SlackModal } from "./components/SlackModal.tsx";
import { EtherealPreviewModal } from "./components/EtherealPreviewModal.tsx";

import { ScheduledEmail, SentEmail, Sender, DashboardStats, SlackStatus } from "./types/index.ts";
import { emailsApi, sendersApi, slackApi, analyticsApi } from "./services/api.ts";
import { useToast } from "./context/ToastContext.tsx";

export function App() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"scheduled" | "sent" | "senders">("scheduled");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<SentEmail | null>(null);

  // Fetch all dashboard data
  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [scheduledRes, sentRes, sendersRes, statsRes, slackRes] = await Promise.all([
        emailsApi.getScheduled({ query: searchQuery }),
        emailsApi.getSent({ query: searchQuery }),
        sendersApi.getAll(),
        analyticsApi.getStats(),
        slackApi.getStatus(),
      ]);

      setScheduledEmails(scheduledRes.data.emails || []);
      setSentEmails(sentRes.data.emails || []);
      setSenders(sendersRes.data.senders || []);
      setStats(statsRes.data);
      setSlackStatus(slackRes.data);
    } catch (err) {
      console.warn("Error fetching dashboard data:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [searchQuery]);

  // Initial load
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Polling every 4 seconds for live queue & status updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCancelEmail = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled email?")) return;
    try {
      await emailsApi.cancel(id);
      showToast("Email job cancelled and removed", "info");
      fetchData(false);
    } catch (err) {
      showToast("Failed to cancel email job", "error");
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
      {/* Top Header */}
      <Header
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlack={() => setIsSlackOpen(true)}
        slackStatus={slackStatus}
      />

      {/* Metrics & Overview */}
      <StatsCards stats={stats} loading={loading} />

      {/* Main Content Card with Navigation & Search */}
      <div className="space-y-6">
        {/* Navigation & Controls Bar */}
        <div className="clay-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab("scheduled")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "scheduled"
                  ? "clay-button-primary text-white"
                  : "clay-button text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Scheduled Emails</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  activeTab === "scheduled"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {stats?.counts.scheduled ?? scheduledEmails.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("sent")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "sent"
                  ? "clay-button-primary text-white"
                  : "clay-button text-slate-600 hover:text-slate-900"
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent Emails</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  activeTab === "sent"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {stats?.counts.sent ?? sentEmails.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("senders")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "senders"
                  ? "clay-button-primary text-white"
                  : "clay-button text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Senders & Limits</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  activeTab === "senders"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {senders.length}
              </span>
            </button>
          </div>

          {/* Elasticsearch Search Bar & Refresh */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject, body, lead email..."
                className="w-full clay-input pl-10 pr-4 py-2.5 text-xs font-semibold"
              />
            </div>
            <button
              onClick={() => fetchData(true)}
              title="Refresh Data"
              className="clay-button p-2.5 text-slate-500 hover:text-indigo-600"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === "scheduled" && (
          <ScheduledTab
            emails={scheduledEmails}
            loading={loading}
            onCancel={handleCancelEmail}
            onOpenCompose={() => setIsComposeOpen(true)}
          />
        )}

        {activeTab === "sent" && (
          <SentTab
            emails={sentEmails}
            loading={loading}
            onPreview={(email) => setPreviewEmail(email)}
            onOpenCompose={() => setIsComposeOpen(true)}
          />
        )}

        {activeTab === "senders" && (
          <SendersTab
            senders={senders}
            loading={loading}
            onRefresh={() => fetchData(false)}
          />
        )}
      </div>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        onScheduled={() => fetchData(false)}
      />

      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        status={slackStatus}
        onStatusUpdated={() => fetchData(false)}
      />

      <EtherealPreviewModal
        email={previewEmail}
        onClose={() => setPreviewEmail(null)}
      />
    </div>
  );
}
export default App;
