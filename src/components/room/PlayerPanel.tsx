import React, { useRef, useEffect, useState } from "react";
import { PlaybackControls } from "./PlaybackControls";
import { Tv, AlertCircle } from "lucide-react";

interface PlayerPanelProps {
  videoUrl: string | null;
  provider: "youtube" | "html5";
  isPlaying: boolean;
  currentTime: number;
  canControl: boolean;
  onPlayStateChange: (isPlaying: boolean, time: number) => void;
  onSeek: (time: number) => void;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  videoUrl,
  provider,
  isPlaying,
  currentTime,
  canControl,
  onPlayStateChange,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [localCurrentTime, setLocalCurrentTime] = useState<number>(currentTime);

  // Sync incoming server timestamps
  useEffect(() => {
    if (provider === "html5" && videoRef.current) {
      const diff = Math.abs(videoRef.current.currentTime - currentTime);
      if (diff > 0.8) {
        videoRef.current.currentTime = currentTime;
      }
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
    setLocalCurrentTime(currentTime);
  }, [currentTime, isPlaying, provider]);

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      let videoId = "";
      if (parsed.hostname.includes("youtube.com")) {
        videoId = parsed.searchParams.get("v") || "";
      } else if (parsed.hostname.includes("youtu.be")) {
        videoId = parsed.pathname.slice(1);
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1` : null;
    } catch {
      return null;
    }
  };

  const ytEmbed = videoUrl && provider === "youtube" ? getYouTubeEmbedUrl(videoUrl) : null;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col justify-between bg-zinc-950 p-3 sm:p-4 rounded-xl border border-zinc-800 relative overflow-hidden min-h-[360px]"
    >
      <div className="flex-1 flex items-center justify-center relative bg-black/60 rounded-lg overflow-hidden border border-zinc-900 shadow-inner">
        {!videoUrl ? (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="p-4 bg-zinc-900 rounded-full text-zinc-600">
              <Tv className="w-10 h-10" />
            </div>
            <h3 className="text-zinc-300 font-medium text-base">No video loaded</h3>
            <p className="text-zinc-500 text-xs max-w-sm">
              The room host can paste a YouTube URL or direct MP4/WebM stream to begin watching together.
            </p>
          </div>
        ) : provider === "youtube" && ytEmbed ? (
          <iframe
            ref={iframeRef}
            src={ytEmbed}
            title="YouTube Player"
            className="w-full h-full aspect-video border-0 rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : provider === "html5" && videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full aspect-video object-contain"
            onTimeUpdate={() => {
              if (videoRef.current) {
                setLocalCurrentTime(videoRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
              }
            }}
          />
        ) : (
          <div className="flex items-center space-x-2 text-amber-400 text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>Unsupported video format or invalid URL</span>
          </div>
        )}
      </div>

      <div className="pt-3">
        <PlaybackControls
          isPlaying={isPlaying}
          currentTime={localCurrentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          canControl={canControl}
          onPlayPause={() => {
            const nextPlay = !isPlaying;
            onPlayStateChange(nextPlay, localCurrentTime);
          }}
          onSeek={(newTime) => {
            setLocalCurrentTime(newTime);
            onSeek(newTime);
          }}
          onVolumeChange={(val) => {
            setVolume(val);
            if (videoRef.current) videoRef.current.volume = val;
          }}
          onToggleMute={() => {
            setIsMuted((prev) => !prev);
            if (videoRef.current) videoRef.current.muted = !isMuted;
          }}
          onToggleFullscreen={handleToggleFullscreen}
        />
      </div>
    </div>
  );
};
