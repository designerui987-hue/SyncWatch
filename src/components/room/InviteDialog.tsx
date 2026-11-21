import React, { useState } from "react";
import { Copy, Check, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inviteToken?: string | null;
  roomId: string;
}

export const InviteDialog: React.FC<InviteDialogProps> = ({
  isOpen,
  onClose,
  inviteToken,
  roomId,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = inviteToken
    ? `${origin}/invite/${inviteToken}`
    : `${origin}/room/${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200"
          aria-label="Close invite modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-violet-400 mb-2">
          <Share2 className="w-5 h-5" />
          <h3 className="font-semibold text-zinc-100 text-sm">Invite Friends</h3>
        </div>

        <p className="text-xs text-zinc-400 mb-4">
          Anyone with this private invite link can join and synchronize playback with you.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono select-all focus:outline-none"
          />
          <Button
            size="sm"
            onClick={handleCopy}
            className="bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>

        <div className="text-[11px] text-zinc-500 text-center">
          Invite links are valid for up to 7 days.
        </div>
      </div>
    </div>
  );
};
