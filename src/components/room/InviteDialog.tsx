"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Share2, X, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inviteToken?: string | null;
  roomId: string;
  isHostOrCoHost?: boolean;
}

export const InviteDialog: React.FC<InviteDialogProps> = ({
  isOpen,
  onClose,
  inviteToken: initialToken,
  roomId,
  isHostOrCoHost = false,
}) => {
  const [token, setToken] = useState<string | null>(initialToken || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
      return;
    }

    if (isOpen && !token && isHostOrCoHost) {
      // Fetch or generate token from API
      setLoading(true);
      setError(null);
      fetch(`/api/rooms/${roomId}/invite`, { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setToken(data.token);
          } else {
            setError(data.error || "Failed to generate invite link");
          }
        })
        .catch(() => {
          setError("Network error fetching invite token");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, initialToken, token, roomId, isHostOrCoHost]);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = token ? `${origin}/invite/${token}` : null;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleRevoke = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/invite?token=${token}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setToken(null);
        setError("Invite link was revoked.");
      }
    } catch {
      setError("Failed to revoke invite link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl relative text-zinc-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200"
          aria-label="Close invite modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-violet-400 mb-2">
          <Share2 className="w-5 h-5" />
          <h3 className="font-semibold text-zinc-100 text-sm">Invite Friends to Watch</h3>
        </div>

        <p className="text-xs text-zinc-400 mb-4">
          Share this private invitation link with your friends to grant them access to this watch room.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-zinc-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
            <span>Generating secure invitation link…</span>
          </div>
        ) : error && !inviteUrl ? (
          <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-xs text-red-300 flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        ) : inviteUrl ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono select-all focus:outline-none"
              />
              <Button
                size="sm"
                onClick={handleCopy}
                className="bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5 h-9"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
              <span>Valid for 7 days</span>
              {isHostOrCoHost && (
                <button
                  type="button"
                  onClick={handleRevoke}
                  className="text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Revoke link</span>
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
