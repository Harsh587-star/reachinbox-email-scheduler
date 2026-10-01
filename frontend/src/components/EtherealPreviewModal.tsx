import React from "react";
import { X, ExternalLink, Mail, ShieldCheck } from "lucide-react";
import { SentEmail } from "../types/index.ts";

interface EtherealPreviewModalProps {
  email: SentEmail | null;
  onClose: () => void;
}

export const EtherealPreviewModal: React.FC<EtherealPreviewModalProps> = ({ email, onClose }) => {
  if (!email) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="clay-card w-full max-w-4xl h-[85vh] flex flex-col p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800">Ethereal Live Web Preview</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Delivered via Fake SMTP
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md">
                To: <span className="font-semibold text-slate-700">{email.recipientEmail}</span> • Subject: "{email.subject}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {email.etherealPreviewUrl && (
              <a
                href={email.etherealPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="clay-button px-3.5 py-1.5 text-xs font-bold text-indigo-600 flex items-center gap-1.5"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content iframe */}
        <div className="flex-1 w-full bg-white rounded-2xl overflow-hidden shadow-inner border border-slate-200">
          {email.etherealPreviewUrl ? (
            <iframe
              src={email.etherealPreviewUrl}
              title="Ethereal Preview"
              className="w-full h-full border-0"
            />
          ) : (
            <div className="p-8 text-center text-slate-500">
              <p>No external preview URL recorded for this email.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
