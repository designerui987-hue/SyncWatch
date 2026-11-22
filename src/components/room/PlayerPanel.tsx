"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { PlaybackControls } from "./PlaybackControls";
import { Tv, AlertCircle, VolumeX, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlayerPanelProps {
  videoUrl: string | null;
  provider: "youtube" | "html5";
  isPlaying: boolean;
  currentTime: number;
  canControl: boolean;
  isDisconnected?: boolean;
  onPlayStateChange: (isPlaying: boolean, time: number) => void;
  onSeek: (time: number) => void;
}

function parseYouTubeVideoId(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v") || null;
    }
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1) || null;
    }
  } catch {
    // Check direct 11-char ID format
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  }
  return null;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  videoUrl,
  provider,
  isPlaying,
  currentTime,
  canControl,
  isDisconnected = false,
  onPlayStateChange,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isYtReady, setIsYtReady] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [localCurrentTime, setLocalCurrentTime] = useState<number>(currentTime);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const isRemoteActionRef = useRef<boolean>(false);
  const canControlRef = useRef<boolean>(canControl);
  canControlRef.current = canControl;
  const onPlayStateChangeRef = useRef(onPlayStateChange);
  onPlayStateChangeRef.current = onPlayStateChange;
  const currentTimeRef = useRef<number>(currentTime);
  currentTimeRef.current = currentTime;
  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const youtubeVideoId = parseYouTubeVideoId(videoUrl);

  // ─── 1. Load YouTube IFrame API Script ───────────────────────────────────────
  useEffect(() => {
    if (provider !== "youtube") return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.body.appendChild(tag);
    }
  }, [provider]);

  // ─── 2. Initialize YouTube Player Instance ──────────────────────────────────
  useEffect(() => {
    if (provider !== "youtube" || !youtubeVideoId) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
        setIsYtReady(false);
      }
      return;
    }

    let isSubscribed = true;

    const initPlayer = () => {
      if (!isSubscribed || !ytPlayerContainerRef.current || !window.YT?.Player) return;

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
      }

      ytPlayerRef.current = new window.YT.Player(ytPlayerContainerRef.current, {
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0, // Custom synchronized controls
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: (event: any) => {
            if (!isSubscribed) return;
            setIsYtReady(true);
            setPlayerError(null);
            const totalDur = event.target.getDuration();
            if (totalDur) setDuration(totalDur);

            // Apply initial seek if already ahead
            if (currentTimeRef.current > 0) {
              isRemoteActionRef.current = true;
              event.target.seekTo(currentTimeRef.current, true);
            }
            if (isPlayingRef.current) {
              isRemoteActionRef.current = true;
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            if (!isSubscribed) return;
            const player = event.target;
            const state = event.data;

            // Update duration if not yet loaded
            const dur = player.getDuration();
            if (dur) setDuration(dur);

            // If state change was triggered by remote sync event, do not echo back
            if (isRemoteActionRef.current) {
              isRemoteActionRef.current = false;
              return;
            }

            // Only hosts and co-hosts emit local state changes to the room
            if (!canControlRef.current) return;

            const time = player.getCurrentTime ? player.getCurrentTime() : 0;
            if (state === window.YT.PlayerState.PLAYING) {
              onPlayStateChangeRef.current(true, time);
            } else if (state === window.YT.PlayerState.PAUSED) {
              onPlayStateChangeRef.current(false, time);
            }
          },
          onError: (event: any) => {
            if (!isSubscribed) return;
            const errCode = event.data;
            if (errCode === 150 || errCode === 101) {
              setPlayerError("The video owner has restricted external embedding for this video.");
            } else if (errCode === 5) {
              setAutoplayBlocked(true);
            } else {
              setPlayerError("Failed to load YouTube video stream.");
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }

    return () => {
      isSubscribed = false;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
      setIsYtReady(false);
    };
  }, [provider, youtubeVideoId]);

  // ─── 3. Sync Remote State & Drift Correction ────────────────────────────────
  useEffect(() => {
    setLocalCurrentTime(currentTime);

    // YouTube Sync
    if (provider === "youtube" && isYtReady && ytPlayerRef.current) {
      try {
        const player = ytPlayerRef.current;
        const playerTime = player.getCurrentTime ? player.getCurrentTime() : 0;
        const drift = Math.abs(playerTime - currentTime);

        // Drift correction: if out of sync by > 1.0s, seekTo target
        if (drift > 1.0) {
          isRemoteActionRef.current = true;
          player.seekTo(currentTime, true);
        }

        const playerState = player.getPlayerState ? player.getPlayerState() : -1;
        if (isPlaying && playerState !== window.YT?.PlayerState?.PLAYING) {
          isRemoteActionRef.current = true;
          player.playVideo();
        } else if (!isPlaying && playerState === window.YT?.PlayerState?.PLAYING) {
          isRemoteActionRef.current = true;
          player.pauseVideo();
        }
      } catch (err) {
        // Autoplay may be rejected by browser
        if (isPlaying) setAutoplayBlocked(true);
      }
    }

    // HTML5 Native Video Sync
    if (provider === "html5" && videoRef.current) {
      const vid = videoRef.current;
      const drift = Math.abs(vid.currentTime - currentTime);
      if (drift > 0.8) {
        vid.currentTime = currentTime;
      }
      if (isPlaying && vid.paused) {
        vid.play().catch(() => setAutoplayBlocked(true));
      } else if (!isPlaying && !vid.paused) {
        vid.pause();
      }
    }
  }, [currentTime, isPlaying, isYtReady, provider]);

  // ─── 4. Periodic Progress Tick ──────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (provider === "youtube" && isYtReady && ytPlayerRef.current?.getCurrentTime) {
        setLocalCurrentTime(ytPlayerRef.current.getCurrentTime());
      } else if (provider === "html5" && videoRef.current) {
        setLocalCurrentTime(videoRef.current.currentTime);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, isYtReady, provider]);

  // ─── 5. Autoplay Gesture Resolver ───────────────────────────────────────────
  const handleResolveAutoplay = useCallback(() => {
    setAutoplayBlocked(false);
    if (provider === "youtube" && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.playVideo();
      } catch {}
    } else if (provider === "html5" && videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
    }
  }, [provider]);

  // ─── 6. Controls Event Handlers ─────────────────────────────────────────────
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handlePlayPause = () => {
    const nextPlay = !isPlaying;
    if (provider === "youtube" && ytPlayerRef.current) {
      isRemoteActionRef.current = true;
      if (nextPlay) ytPlayerRef.current.playVideo();
      else ytPlayerRef.current.pauseVideo();
    } else if (provider === "html5" && videoRef.current) {
      if (nextPlay) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
    onPlayStateChange(nextPlay, localCurrentTime);
  };

  const handleSeek = (newTime: number) => {
    setLocalCurrentTime(newTime);
    if (provider === "youtube" && ytPlayerRef.current) {
      isRemoteActionRef.current = true;
      ytPlayerRef.current.seekTo(newTime, true);
    } else if (provider === "html5" && videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    onSeek(newTime);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (provider === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(newVolume * 100);
      if (newVolume > 0 && ytPlayerRef.current.isMuted()) {
        ytPlayerRef.current.unMute();
      }
    } else if (provider === "html5" && videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (provider === "youtube" && ytPlayerRef.current) {
      if (nextMuted) ytPlayerRef.current.mute();
      else ytPlayerRef.current.unMute();
    } else if (provider === "html5" && videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col justify-between bg-zinc-950 p-3 sm:p-4 rounded-xl border border-zinc-800 relative overflow-hidden min-h-[360px]"
    >
      {/* Network Failure Banner */}
      {isDisconnected && (
        <div className="absolute top-2 left-4 right-4 z-30 bg-amber-500/90 text-zinc-950 px-3 py-1.5 rounded-lg flex items-center justify-between text-xs font-medium shadow-lg backdrop-blur">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4" />
            <span>Connection interrupted. Reconnecting to watch room…</span>
          </div>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        </div>
      )}

      {/* Autoplay Blocked Banner */}
      {autoplayBlocked && (
        <div className="absolute top-2 left-4 right-4 z-30 bg-violet-600 text-white px-3 py-2 rounded-lg flex items-center justify-between text-xs font-medium shadow-xl">
          <div className="flex items-center space-x-2">
            <VolumeX className="w-4 h-4" />
            <span>Browser paused autoplay. Click to unmute and resume synchronization.</span>
          </div>
          <Button
            size="sm"
            onClick={handleResolveAutoplay}
            className="bg-white text-violet-950 hover:bg-zinc-200 text-xs h-7 px-3 font-semibold"
          >
            Unmute &amp; Sync
          </Button>
        </div>
      )}

      {/* Main Video Viewport */}
      <div className="flex-1 flex items-center justify-center relative bg-black/80 rounded-lg overflow-hidden border border-zinc-900 shadow-inner">
        {!videoUrl ? (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="p-4 bg-zinc-900 rounded-full text-zinc-600">
              <Tv className="w-10 h-10" />
            </div>
            <h3 className="text-zinc-300 font-medium text-base">No video loaded</h3>
            <p className="text-zinc-500 text-xs max-w-sm">
              The room host can paste a YouTube URL or direct MP4 stream to synchronize watching.
            </p>
          </div>
        ) : playerError ? (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-2">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <h4 className="text-zinc-200 text-xs font-semibold">{playerError}</h4>
            <p className="text-zinc-500 text-[11px] max-w-xs">
              Try a different video or direct stream from an authorized source.
            </p>
          </div>
        ) : provider === "youtube" ? (
          <div className="w-full h-full aspect-video flex items-center justify-center">
            <div
              ref={ytPlayerContainerRef}
              className="w-full h-full aspect-video rounded-lg overflow-hidden pointer-events-none"
            />
          </div>
        ) : provider === "html5" && videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full aspect-video object-contain"
            onLoadedMetadata={() => {
              if (videoRef.current) setDuration(videoRef.current.duration);
            }}
          />
        ) : (
          <div className="flex items-center space-x-2 text-amber-400 text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>Unsupported video provider</span>
          </div>
        )}
      </div>

      {/* Synchronized Transport Controls */}
      <div className="pt-3">
        <PlaybackControls
          isPlaying={isPlaying}
          currentTime={localCurrentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          canControl={canControl}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={handleToggleFullscreen}
        />
      </div>
    </div>
  );
};
