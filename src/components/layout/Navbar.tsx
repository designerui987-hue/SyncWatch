"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, LogOut, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface NavbarProps {
  roomTitle?: string;
  userEmail?: string;
  onToggleMembers?: () => void;
  onlineCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomTitle,
  userEmail,
  onToggleMembers,
  onlineCount = 0,
}) => {
  const router = useRouter();

  const handleSignOut = async () => {
    // Clear demo cookie and storage
    document.cookie = "syncwatch_user=; path=/; max-age=0";
    if (typeof window !== "undefined") {
      localStorage.removeItem("syncwatch_user");
    }

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}

    router.push("/auth");
    router.refresh();
  };

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-4 flex items-center justify-between z-40">
      <div className="flex items-center space-x-3">
        <Link href="/" className="flex items-center space-x-2 text-violet-400 hover:text-violet-300 font-bold text-lg">
          <Film className="w-5 h-5 text-violet-500" />
          <span>SyncWatch</span>
        </Link>
        {roomTitle && (
          <div className="flex items-center space-x-2 pl-3 border-l border-zinc-800 text-sm text-zinc-300">
            <span className="font-medium truncate max-w-[200px] sm:max-w-xs">{roomTitle}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {onToggleMembers && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMembers}
            className="text-zinc-400 hover:text-zinc-100 flex items-center space-x-1.5"
            aria-label="Toggle active watchers"
          >
            <Users className="w-4 h-4" />
            <span className="text-xs">{onlineCount}</span>
          </Button>
        )}

        {userEmail ? (
          <div className="flex items-center space-x-3 text-xs text-zinc-400">
            <span className="hidden md:inline truncate max-w-[140px]">{userEmail}</span>
            <button
              onClick={handleSignOut}
              className="text-zinc-400 hover:text-red-400 transition-colors p-1"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link href="/auth">
            <Button size="sm" variant="outline" className="text-xs h-8">
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};
