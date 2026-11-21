import React from "react";
import { Crown, Shield, User as UserIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RoomMember } from "@/types";

interface MemberListProps {
  members: RoomMember[];
  currentUserId: string;
  isHost: boolean;
  onClose: () => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  currentUserId,
  isHost,
  onClose,
}) => {
  return (
    <div className="w-64 bg-zinc-950 border-l border-zinc-800 flex flex-col h-full z-20">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300">
          Watchers ({members.length})
        </span>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 text-zinc-400">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {members.map((m) => {
          const isSelf = m.user_id === currentUserId;
          return (
            <div
              key={m.id || m.user_id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900/50 text-xs transition-colors"
            >
              <div className="flex items-center space-x-2 truncate">
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold uppercase text-[10px]">
                    {m.display_name?.charAt(0) || "U"}
                  </div>
                  {m.is_online && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                  )}
                </div>
                <div className="truncate">
                  <span className="font-medium text-zinc-200 truncate">
                    {m.display_name} {isSelf && "(You)"}
                  </span>
                </div>
              </div>

              <div className="flex items-center">
                {m.role === "host" ? (
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20 px-1.5 py-0 flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5" />
                    <span>Host</span>
                  </Badge>
                ) : m.role === "co-host" ? (
                  <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/20 px-1.5 py-0 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" />
                    <span>Co-Host</span>
                  </Badge>
                ) : (
                  <span className="text-[10px] text-zinc-500">Viewer</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
