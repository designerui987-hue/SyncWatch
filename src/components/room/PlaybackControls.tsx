import React from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  canControl: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  canControl,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
}) => {
  return (
    <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 select-none shadow-lg backdrop-blur-md">
      {/* Progress Track */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-400 w-10 text-right font-mono">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 100}
          step={0.5}
          value={currentTime}
          disabled={!canControl}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="flex-1 accent-violet-500 cursor-pointer disabled:cursor-not-allowed h-1.5 bg-zinc-800 rounded-lg appearance-none"
          aria-label="Seek position"
        />
        <span className="text-xs text-zinc-400 w-10 font-mono">
          {formatTime(duration)}
        </span>
      </div>

      {/* Button Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!canControl}
            onClick={onPlayPause}
            className="w-9 h-9 p-0 rounded-full border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-100"
            aria-label={isPlaying ? "Pause playback" : "Start playback"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            disabled={!canControl}
            onClick={() => onSeek(Math.max(0, currentTime - 10))}
            className="w-8 h-8 p-0 text-zinc-400 hover:text-zinc-200"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            disabled={!canControl}
            onClick={() => onSeek(currentTime + 10)}
            className="w-8 h-8 p-0 text-zinc-400 hover:text-zinc-200"
            aria-label="Fast-forward 10 seconds"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Button>

          {!canControl && (
            <span className="text-xs text-zinc-500 ml-2 italic">
              Viewer mode (Host manages playback)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleMute}
              className="w-8 h-8 p-0 text-zinc-400 hover:text-zinc-200"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 accent-violet-500 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              aria-label="Volume slider"
            />
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleFullscreen}
            className="w-8 h-8 p-0 text-zinc-400 hover:text-zinc-200"
            aria-label="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
