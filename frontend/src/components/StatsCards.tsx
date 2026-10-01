import React from "react";
import { Clock, Send, ShieldCheck, Cpu } from "lucide-react";
import { DashboardStats } from "../types/index.ts";

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {/* Scheduled Card */}
      <div className="clay-card p-5 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Scheduled Queue
          </span>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-800">
            {loading ? "..." : stats?.counts.scheduled ?? 0}
          </span>
          <span className="text-xs font-semibold text-indigo-600">Pending jobs</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Delayed send via BullMQ</p>
      </div>

      {/* Sent Card */}
      <div className="clay-card p-5 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Sent Emails
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
            <Send className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-800">
            {loading ? "..." : stats?.counts.sent ?? 0}
          </span>
          <span className="text-xs font-semibold text-emerald-600">Delivered</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Via Ethereal Fake SMTP</p>
      </div>

      {/* Worker Concurrency / Queue Load */}
      <div className="clay-card p-5 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            BullMQ Queue Load
          </span>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-800">
            {loading ? "..." : stats?.queue.delayed ?? 0}
          </span>
          <span className="text-xs font-semibold text-purple-600">
            Active: {stats?.queue.active ?? 0}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Concurrency: 5 workers</p>
      </div>

      {/* Rate Limits Rescheduled */}
      <div className="clay-card p-5 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Rate Limit Rescheduled
          </span>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-800">
            {loading ? "..." : stats?.counts.rescheduled ?? 0}
          </span>
          <span className="text-xs font-semibold text-amber-600">Protected</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Rescheduled to next hour</p>
      </div>
    </div>
  );
};
