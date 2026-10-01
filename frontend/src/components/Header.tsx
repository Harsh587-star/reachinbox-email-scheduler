import React from "react";
import { Mail, Plus, Bell, Radio, ExternalLink, LogOut, Sparkles, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { SlackStatus } from "../types/index.ts";

interface HeaderProps {
  onOpenCompose: () => void;
  onOpenSlack: () => void;
  slackStatus: SlackStatus | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCompose,
  onOpenSlack,
  slackStatus,
}) => {
  const { user, logout, loginWithGoogle } = useAuth();

  return (
    <header className="clay-card p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Brand */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-clay-primary">
          <Mail className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">
              Reach<span className="text-indigo-600">Inbox</span>
            </h1>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
              Scheduler 2.0
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            BullMQ Persistent Email Job Engine & Analytics
          </p>
        </div>
      </div>

      {/* Actions & User */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Bull-Board Live Monitor */}
        <a
          href="http://localhost:5000/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="clay-button px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-indigo-600 group"
          title="Open Live BullMQ Queue Monitor"
        >
          <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>BullMQ Live Board</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
        </a>

        {/* Slack Status Pill */}
        <button
          onClick={onOpenSlack}
          className={`clay-button px-4 py-2.5 flex items-center gap-2 text-xs font-bold transition ${
            slackStatus?.isConnected
              ? "text-emerald-700 bg-emerald-50/60"
              : "text-amber-700 bg-amber-50/60"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{slackStatus?.isConnected ? "Slack Connected" : "Connect Slack"}</span>
          <span
            className={`w-2 h-2 rounded-full ${
              slackStatus?.isConnected ? "bg-emerald-500 shadow-sm" : "bg-amber-500 animate-ping"
            }`}
          />
        </button>

        {/* Compose CTA Button */}
        <button
          onClick={onOpenCompose}
          className="clay-button-primary px-5 py-2.5 flex items-center gap-2 font-bold text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Compose New Email</span>
        </button>

        {/* User Info & Logout */}
        {user ? (
          <div className="clay-card-flat px-3 py-1.5 flex items-center gap-3 ml-1">
            <img
              src={user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
              alt={user.name || "User Avatar"}
              className="w-8 h-8 rounded-full ring-2 ring-indigo-400 object-cover"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-[11px] text-slate-500 leading-tight">{user.email}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => loginWithGoogle()}
            className="clay-button px-4 py-2 text-xs font-bold text-indigo-600 flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>
        )}
      </div>
    </header>
  );
};
