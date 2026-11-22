"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PlayerPanel } from "@/components/room/PlayerPanel";
import { ChatPanel } from "@/components/room/ChatPanel";
import { MemberList } from "@/components/room/MemberList";
import { InviteDialog } from "@/components/room/InviteDialog";
import { useSocket } from "@/hooks/useSocket";
import { usePlayback } from "@/hooks/usePlayback";
import { useRoom } from "@/hooks/useRoom";
import { useChat } from "@/hooks/useChat";
import { Share2, Video, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { Room, RoomMember, UserRole, VideoProvider } from "@/types";

interface RoomShellProps {
  room: Room;
  currentUser: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
  initialMembers: RoomMember[];
  userRole: UserRole;
}

export const RoomShell: React.FC<RoomShellProps> = ({
  room: initialRoom,
  currentUser,
  initialMembers,
  userRole,
}) => {
  const { toast } = useToast();
  const [showMembers, setShowMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlModal, setShowUrlModal] = useState(false);

  const {
    room,
    members,
    canControl,
    isHost,
    updateMember,
  } = useRoom({
    initialRoom,
    initialMembers,
    initialRole: userRole,
  });

  const {
    isPlaying,
    currentTime,
    videoUrl,
    provider,
    setVideoUrl,
    setProvider,
    handlePlayStateChange,
    handleSeek,
    applyServerSync,
  } = usePlayback({
    initialVideoUrl: initialRoom.video_url,
    initialProvider: initialRoom.provider,
  });

  const { messages, addMessage } = useChat();

  // Socket connection with session token and active room ID
  const { socket, isConnected, connectionStatus, errorMessage, emit } = useSocket({
    roomId: room.id,
  });

  // Setup socket event listeners with strict cleanup
  useEffect(() => {
    if (!socket) return;

    const handlePlaybackState = ({ state }: any) => {
      applyServerSync(state);
    };

    const handleChatMessage = (msg: any) => {
      addMessage(msg);
    };

    const handleMemberUpdate = ({ member, event }: any) => {
      updateMember(member, event);
    };

    const handleRoomError = (err: { code: string; message: string }) => {
      toast({
        variant: "destructive",
        title: "Watch Room Notice",
        description: err.message,
      });
    };

    socket.on("playback:state", handlePlaybackState);
    socket.on("chat:message", handleChatMessage);
    socket.on("member:update", handleMemberUpdate);
    socket.on("room:error", handleRoomError);

    return () => {
      socket.off("playback:state", handlePlaybackState);
      socket.off("chat:message", handleChatMessage);
      socket.off("member:update", handleMemberUpdate);
      socket.off("room:error", handleRoomError);
    };
  }, [socket, applyServerSync, addMessage, updateMember, toast]);

  const handleSendSyncUpdate = (nextPlay: boolean, time: number) => {
    if (!canControl) {
      toast({
        variant: "destructive",
        title: "Action Restricted",
        description: "Only the room host or co-host can control playback.",
      });
      return;
    }

    handlePlayStateChange(nextPlay, time);
    emit("playback:update", {
      roomId: room.id,
      state: {
        status: nextPlay ? "playing" : "paused",
        current_time: time,
        duration: 0,
        playback_rate: 1,
        video_url: videoUrl,
        provider,
      },
    });
  };

  const handleSendSeek = (newTime: number) => {
    if (!canControl) return;

    handleSeek(newTime);
    emit("playback:update", {
      roomId: room.id,
      state: {
        status: isPlaying ? "playing" : "paused",
        current_time: newTime,
        duration: 0,
        playback_rate: 1,
        video_url: videoUrl,
        provider,
      },
    });
  };

  const handleSendChatMessage = (content: string) => {
    emit("chat:send", {
      roomId: room.id,
      content,
      tempId: `tmp_${Date.now()}`,
    });
  };

  const handleUpdateVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canControl) return;

    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    const detectedProvider: VideoProvider =
      cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")
        ? "youtube"
        : "html5";

    setVideoUrl(cleanUrl);
    setProvider(detectedProvider);
    setShowUrlModal(false);
    setUrlInput("");

    emit("playback:update", {
      roomId: room.id,
      state: {
        status: "paused",
        current_time: 0,
        duration: 0,
        playback_rate: 1,
        video_url: cleanUrl,
        provider: detectedProvider,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <Navbar
        roomTitle={room.name}
        userEmail={currentUser.email}
        onToggleMembers={() => setShowMembers((prev) => !prev)}
        onlineCount={members.length}
      />

      {/* Main room content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <main className="flex-1 flex flex-col p-3 sm:p-4 gap-3 overflow-y-auto">
          {/* Action bar */}
          <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800/80 px-4 py-2.5 rounded-xl">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? "bg-emerald-500"
                    : connectionStatus === "reconnecting"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-red-500"
                }`}
              />
              <span className="text-xs text-zinc-400 capitalize">
                {connectionStatus === "connected"
                  ? "Synchronized"
                  : connectionStatus === "reconnecting"
                  ? "Reconnecting…"
                  : connectionStatus}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {canControl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUrlModal(true)}
                  className="text-xs h-8 border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                >
                  <Video className="w-3.5 h-3.5 mr-1 text-violet-400" />
                  Load Video
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowInviteModal(true)}
                className="text-xs h-8 border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
              >
                <Share2 className="w-3.5 h-3.5 mr-1 text-violet-400" />
                Invite
              </Button>
            </div>
          </div>

          {/* Video Player */}
          <PlayerPanel
            videoUrl={videoUrl}
            provider={provider}
            isPlaying={isPlaying}
            currentTime={currentTime}
            canControl={canControl}
            isDisconnected={!isConnected}
            onPlayStateChange={handleSendSyncUpdate}
            onSeek={handleSendSeek}
          />
        </main>

        {/* Sidebar: Chat */}
        <aside className="p-3 sm:p-4 lg:pl-0 flex flex-col">
          <ChatPanel
            messages={messages}
            currentUserId={currentUser.id}
            onSendMessage={handleSendChatMessage}
          />
        </aside>

        {/* Slide-over member drawer */}
        {showMembers && (
          <div className="absolute right-0 top-0 bottom-0 shadow-2xl z-30">
            <MemberList
              members={members}
              currentUserId={currentUser.id}
              isHost={isHost}
              onClose={() => setShowMembers(false)}
            />
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      <InviteDialog
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        inviteToken={room.invite_token}
        roomId={room.id}
      />

      {/* Load Video Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="font-semibold text-zinc-100 text-sm mb-2">Load Video Stream</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Enter a public YouTube URL or direct MP4/WebM video stream.
            </p>
            <form onSubmit={handleUpdateVideo} className="space-y-4">
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowUrlModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs"
                >
                  Set Video
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
