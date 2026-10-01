import React from "react";
import { format } from "date-fns";
import { Clock, Trash2, ShieldAlert, Sparkles } from "lucide-react";
import { ScheduledEmail } from "../types/index.ts";

interface ScheduledTabProps {
  emails: ScheduledEmail[];
  loading: boolean;
  onCancel: (id: string) => void;
  onOpenCompose: () => void;
}

export const ScheduledTab: React.FC<ScheduledTabProps> = ({
  emails,
  loading,
  onCancel,
  onOpenCompose,
}) => {
  if (loading && emails.length === 0) {
    return (
      <div className="clay-card p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-600 font-semibold">Loading scheduled jobs...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="clay-card p-14 text-center">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-5 shadow-clay-card">
          <Clock className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No Scheduled Emails</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
          Schedule your first cold email sequence with delay throttling and rate limit protection.
        </p>
        <button
          onClick={onOpenCompose}
          className="clay-button-primary px-6 py-3 font-bold text-sm inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Schedule New Campaign</span>
        </button>
      </div>
    );
  }

  return (
    <div className="clay-card p-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-4 pl-3">Recipient</th>
              <th className="pb-4">Subject</th>
              <th className="pb-4">Sender</th>
              <th className="pb-4">Scheduled For</th>
              <th className="pb-4">Delay</th>
              <th className="pb-4">Status</th>
              <th className="pb-4 text-right pr-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
            {emails.map((email) => {
              let statusBadgeClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
              if (email.status === "RESCHEDULED") {
                statusBadgeClass = "bg-amber-100 text-amber-800 border-amber-200";
              } else if (email.status === "SENDING") {
                statusBadgeClass = "bg-purple-100 text-purple-800 border-purple-200 animate-pulse";
              }

              return (
                <tr key={email.id} className="hover:bg-slate-50/70 transition duration-150">
                  <td className="py-4 pl-3">
                    <span className="font-bold text-slate-900">{email.recipientEmail}</span>
                  </td>
                  <td className="py-4 max-w-xs truncate" title={email.subject}>
                    {email.subject}
                  </td>
                  <td className="py-4 text-xs text-slate-500">
                    <div>{email.senderName}</div>
                    <div className="text-[11px] text-slate-400">{email.senderEmail}</div>
                  </td>
                  <td className="py-4 whitespace-nowrap text-slate-600">
                    {format(new Date(email.scheduledAt), "MMM d, yyyy • hh:mm a")}
                  </td>
                  <td className="py-4 text-xs text-slate-500">{email.delaySeconds}s delay</td>
                  <td className="py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeClass}`}
                    >
                      {email.status === "RESCHEDULED" && <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />}
                      {email.status}
                    </span>
                  </td>
                  <td className="py-4 text-right pr-3">
                    <button
                      onClick={() => onCancel(email.id)}
                      title="Cancel & Delete Job"
                      className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
