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
import { Share2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // Socket connection
  const { socket, isConnected, emit } = useSocket(currentUser.id);

  // Setup socket event listeners
  useEffect(() => {
    if (!socket) return;

    emit("join-room", {
      roomId: room.id,
      token: currentUser.id,
    });

    socket.on("playback:state", ({ state }) => {
      applyServerSync(state);
    });

    socket.on("chat:message", (msg) => {
      addMessage(msg);
    });

    socket.on("member:update", ({ member, event }) => {
      updateMember(member, event);
    });
  }, [socket, room.id, currentUser.id, emit, applyServerSync, addMessage, updateMember]);

  const handleSendSyncUpdate = (nextPlay: boolean, time: number) => {
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
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    const detectedProvider: VideoProvider = cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")
      ? "youtube"
      : "html5";

    setVideoUrl(cleanUrl);
    setProvider(detectedProvider);
    setShowUrlModal(false);

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
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-xs text-zinc-400">
                {isConnected ? "Synchronized" : "Connecting..."}
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
                <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs">
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
