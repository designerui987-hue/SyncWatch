import { useState, useCallback, useEffect } from "react";
import type { PlaybackState, VideoProvider } from "@/types";

interface UsePlaybackProps {
  initialVideoUrl?: string | null;
  initialProvider?: VideoProvider;
  onSyncState?: (state: Partial<PlaybackState>) => void;
}

export function usePlayback({
  initialVideoUrl = null,
  initialProvider = "youtube",
  onSyncState,
}: UsePlaybackProps = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
  const [provider, setProvider] = useState<VideoProvider>(initialProvider);

  const handlePlayStateChange = useCallback(
    (nextPlay: boolean, time: number) => {
      setIsPlaying(nextPlay);
      setCurrentTime(time);
      if (onSyncState) {
        onSyncState({
          status: nextPlay ? "playing" : "paused",
          current_time: time,
          video_url: videoUrl,
          provider,
        });
      }
    },
    [videoUrl, provider, onSyncState]
  );

  const handleSeek = useCallback(
    (newTime: number) => {
      setCurrentTime(newTime);
      if (onSyncState) {
        onSyncState({
          status: isPlaying ? "playing" : "paused",
          current_time: newTime,
          video_url: videoUrl,
          provider,
        });
      }
    },
    [isPlaying, videoUrl, provider, onSyncState]
  );

  const applyServerSync = useCallback((serverState: PlaybackState) => {
    setIsPlaying(serverState.status === "playing");
    setCurrentTime(serverState.current_time);
    if (serverState.video_url !== undefined) {
      setVideoUrl(serverState.video_url);
    }
    if (serverState.provider) {
      setProvider(serverState.provider);
    }
  }, []);

  return {
    isPlaying,
    currentTime,
    videoUrl,
    provider,
    setVideoUrl,
    setProvider,
    handlePlayStateChange,
    handleSeek,
    applyServerSync,
  };
}
