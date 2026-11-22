"use client";

import React, { useState, useEffect } from "react";
import { Smartphone, Laptop, AlertCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompanionModeNoticeProps {
  provider: string;
  onOpenWizard?: () => void;
}

export const CompanionModeNotice: React.FC<CompanionModeNoticeProps> = ({
  provider,
  onOpenWizard,
}) => {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = navigator.userAgent || "";
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
        (navigator.maxTouchPoints > 1 && /Macintosh/.test(userAgent)); // iPad detection
      setIsMobileDevice(isMobile);
    }
  }, []);

  if (dismissed) return null;

  const isThirdPartyOTT = provider === "netflix" || provider === "prime_video" || provider === "jiohotstar";

  if (isMobileDevice) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold text-amber-300">Mobile Companion Mode: </span>
            {isThirdPartyOTT ? (
              <span>
                Operating system sandboxes (iOS & Android) prevent mobile browsers from controlling native OTT apps. Use SyncWatch on this device for synchronized chat, participant presence, and timestamp tracking.
              </span>
            ) : (
              <span>
                Optimized for touch playback. Embedded YouTube and direct video playback can be controlled directly inside this room.
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onOpenWizard && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenWizard}
              className="h-7 text-[11px] bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
            >
              Access Wizard
            </Button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-400/70 hover:text-amber-200 text-xs px-1"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="bg-neutral-900/60 border-b border-neutral-800 px-4 py-2 text-xs text-neutral-400 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Laptop className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>
          <strong className="text-neutral-300">Desktop Sync Active: </strong>
          {isThirdPartyOTT
            ? "Syncing via official SyncWatch Companion Extension on verified domain."
            : "Direct in-app embedded playback synchronization with active drift correction."}
        </span>
      </div>
      {onOpenWizard && (
        <button
          onClick={onOpenWizard}
          className="text-indigo-400 hover:text-indigo-300 underline text-[11px] shrink-0"
        >
          Check Party Entitlements
        </button>
      )}
    </div>
  );
};
