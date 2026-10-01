import React from "react";
import { format } from "date-fns";
import { Send, CheckCircle2, XCircle, ExternalLink, MailOpen } from "lucide-react";
import { SentEmail } from "../types/index.ts";

interface SentTabProps {
  emails: SentEmail[];
  loading: boolean;
  onPreview: (email: SentEmail) => void;
  onOpenCompose: () => void;
}

export const SentTab: React.FC<SentTabProps> = ({
  emails,
  loading,
  onPreview,
  onOpenCompose,
}) => {
  if (loading && emails.length === 0) {
    return (
      <div className="clay-card p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-600 font-semibold">Loading sent emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="clay-card p-14 text-center">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-clay-card">
          <Send className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No Sent Emails Yet</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
          Once your scheduled jobs execute, your sent emails and Ethereal live preview links will appear here.
        </p>
        <button
          onClick={onOpenCompose}
          className="clay-button-primary px-6 py-3 font-bold text-sm inline-flex items-center gap-2"
        >
          <span>Send Your First Email</span>
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
              <th className="pb-4">Sent Time</th>
              <th className="pb-4">Status</th>
              <th className="pb-4 text-right pr-3">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
            {emails.map((email) => {
              const isSuccess = email.status === "SENT";

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
                    {email.sentAt ? format(new Date(email.sentAt), "MMM d, yyyy • hh:mm a") : "—"}
                  </td>
                  <td className="py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        isSuccess
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-rose-100 text-rose-800 border-rose-200"
                      }`}
                    >
                      {isSuccess ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      {email.status}
                    </span>
                  </td>
                  <td className="py-4 text-right pr-3">
                    {email.etherealPreviewUrl ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => onPreview(email)}
                          className="clay-button px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                        >
                          <MailOpen className="w-3.5 h-3.5" />
                          <span>View Preview</span>
                        </button>
                        <a
                          href={email.etherealPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-indigo-600 p-1.5 transition"
                          title="Open in Ethereal"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No preview URL</span>
                    )}
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
