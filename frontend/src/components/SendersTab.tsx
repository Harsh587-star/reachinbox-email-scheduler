import React, { useState } from "react";
import { Users, Plus, Shield, Check, Mail } from "lucide-react";
import { Sender } from "../types/index.ts";
import { sendersApi } from "../services/api.ts";
import { useToast } from "../context/ToastContext.tsx";

interface SendersTabProps {
  senders: Sender[];
  loading: boolean;
  onRefresh: () => void;
}

export const SendersTab: React.FC<SendersTabProps> = ({ senders, loading, onRefresh }) => {
  const { showToast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hourlyLimit, setHourlyLimit] = useState("20");
  const [submitting, setSubmitting] = useState(false);

  const handleCreateSender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setSubmitting(true);
    try {
      await sendersApi.create({
        name,
        email,
        hourlyLimit: parseInt(hourlyLimit, 10) || 20,
      });
      showToast(`Sender "${name}" created successfully!`, "success");
      setName("");
      setEmail("");
      setShowAddForm(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to create sender", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLimit = async (senderId: string, currentLimit: number) => {
    const newLimit = prompt(`Enter new hourly limit for sender (current: ${currentLimit}):`, String(currentLimit));
    if (!newLimit || isNaN(Number(newLimit))) return;

    try {
      await sendersApi.update(senderId, { hourlyLimit: parseInt(newLimit, 10) });
      showToast("Hourly limit updated!", "success");
      onRefresh();
    } catch (err: any) {
      showToast("Failed to update limit", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Sender Profiles & Rate Limits</h2>
          <p className="text-xs text-slate-500">
            Configure multi-sender accounts and per-sender hourly throttling quotas.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="clay-button px-4 py-2 text-xs font-bold text-indigo-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? "Close Form" : "Add New Sender"}</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateSender} className="clay-card p-6 border-2 border-indigo-200 animate-slide-in">
          <h3 className="text-base font-bold text-slate-800 mb-4">Create New Sender Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Sender Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sales Team"
                required
                className="w-full clay-input px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Sender Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sales@outbox.ai"
                required
                className="w-full clay-input px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Max Emails / Hour</label>
              <input
                type="number"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(e.target.value)}
                min="1"
                max="1000"
                required
                className="w-full clay-input px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="clay-button px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="clay-button-primary px-5 py-2 text-xs font-bold flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? "Saving..." : "Save Sender"}</span>
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {senders.map((sender) => (
          <div key={sender.id} className="clay-card p-5 relative overflow-hidden group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>

            <h3 className="font-bold text-base text-slate-800">{sender.name}</h3>
            <p className="text-xs text-slate-500 mb-4">{sender.email}</p>

            <div className="clay-card-soft p-3 mb-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Hourly Quota:</span>
                <span className="font-bold text-indigo-700">{sender.hourlyLimit} emails/hr</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Total Emails Sent:</span>
                <span className="font-bold text-slate-700">{sender._count?.emails ?? 0}</span>
              </div>
            </div>

            <button
              onClick={() => handleUpdateLimit(sender.id, sender.hourlyLimit)}
              className="w-full clay-button py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-2"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Adjust Rate Limit</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
