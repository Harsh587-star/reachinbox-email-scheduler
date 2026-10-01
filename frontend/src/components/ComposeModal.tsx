import React, { useState } from "react";
import { X, UploadCloud, Calendar, Clock, Gauge, Send, Sparkles, Check, AlertCircle } from "lucide-react";
import { Sender } from "../types/index.ts";
import { emailsApi } from "../services/api.ts";
import { useToast } from "../context/ToastContext.tsx";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: Sender[];
  onScheduled: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  senders,
  onScheduled,
}) => {
  const { showToast } = useToast();
  const [selectedSenderId, setSelectedSenderId] = useState(senders[0]?.id || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(
    "Hi {{name}},\n\nI came across your work and was very impressed with what you are building. Would love to connect for 10 minutes this week.\n\nBest regards,\nReachInbox Team"
  );
  const [recipientsInput, setRecipientsInput] = useState("");
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(20);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync default sender if not set
  React.useEffect(() => {
    if (!selectedSenderId && senders.length > 0) {
      setSelectedSenderId(senders[0].id);
      setHourlyLimit(senders[0].hourlyLimit);
    }
  }, [senders, selectedSenderId]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await emailsApi.parseCsv(formData);
      const emails: string[] = res.data.emails || [];
      setParsedEmails(emails);
      setRecipientsInput(emails.join(", "));
      showToast(`Successfully parsed ${emails.length} email leads!`, "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to parse CSV file", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRecipientsChange = (text: string) => {
    setRecipientsInput(text);
    const emails = Array.from(
      new Set(
        (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).map((e) =>
          e.trim().toLowerCase()
        )
      )
    );
    setParsedEmails(emails);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSenderId) {
      showToast("Please select a sender", "error");
      return;
    }

    if (parsedEmails.length === 0) {
      showToast("Please add at least one valid recipient lead", "error");
      return;
    }

    if (!subject.trim()) {
      showToast("Please enter an email subject", "error");
      return;
    }

    setSubmitting(true);
    try {
      // Default to current time + 5 seconds if not scheduled in future
      const targetTime = scheduledAt
        ? new Date(scheduledAt).toISOString()
        : new Date(Date.now() + 5000).toISOString();

      await emailsApi.schedule({
        senderId: selectedSenderId,
        recipients: parsedEmails,
        subject,
        body,
        scheduledAt: targetTime,
        delaySeconds,
        hourlyLimit,
      });

      showToast(`Successfully scheduled ${parsedEmails.length} emails!`, "success");
      onScheduled();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to schedule emails", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="clay-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-7 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Compose New Campaign</h2>
              <p className="text-xs text-slate-500">Configure scheduling, throttling & lead list</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Sender Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              From (Sender Profile)
            </label>
            <select
              value={selectedSenderId}
              onChange={(e) => {
                setSelectedSenderId(e.target.value);
                const s = senders.find((snd) => snd.id === e.target.value);
                if (s) setHourlyLimit(s.hourlyLimit);
              }}
              className="w-full clay-input px-4 py-3 text-sm font-semibold text-slate-800"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} &lt;{s.email}&gt; (Limit: {s.hourlyLimit}/hr)
                </option>
              ))}
            </select>
          </div>

          {/* Lead CSV/Text Upload & Manual Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recipients & Leads
              </label>
              <span className="text-xs font-bold text-indigo-600">
                {parsedEmails.length} lead{parsedEmails.length === 1 ? "" : "s"} detected
              </span>
            </div>

            {/* Drag/Drop & File Input */}
            <div className="clay-card-soft p-4 mb-3 border border-dashed border-indigo-300 text-center rounded-2xl relative">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                <UploadCloud className="w-6 h-6 text-indigo-500" />
                <p className="text-xs font-bold text-slate-700">
                  {uploading ? "Parsing File..." : "Click or Drag CSV / TXT Lead List"}
                </p>
                <p className="text-[11px] text-slate-400">Extracts and deduplicates all email addresses automatically</p>
              </div>
            </div>

            <textarea
              value={recipientsInput}
              onChange={(e) => handleRecipientsChange(e.target.value)}
              placeholder="Or paste emails separated by commas or newlines (e.g. alex@example.com, sara@test.com)"
              rows={2}
              className="w-full clay-input p-3 text-xs font-mono"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question regarding your sales pipeline"
              required
              className="w-full clay-input px-4 py-3 text-sm font-semibold"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Email Body (Supports HTML)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              required
              className="w-full clay-input p-4 text-sm font-medium leading-relaxed"
            />
          </div>

          {/* Scheduling Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Start Time */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full clay-input px-3 py-2.5 text-xs font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">Leave empty to send immediately</p>
            </div>

            {/* Delay between sends */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Delay Between: {delaySeconds}s</span>
              </label>
              <input
                type="range"
                min="1"
                max="15"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">Provider throttling delay</p>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                <span>Max / Hour</span>
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10))}
                className="w-full clay-input px-3 py-2 text-xs font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Next window on limit hit</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="clay-button px-5 py-2.5 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="clay-button-primary px-7 py-2.5 text-xs font-bold flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? "Scheduling Jobs..." : "Schedule Emails"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
