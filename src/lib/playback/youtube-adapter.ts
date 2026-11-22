import {
  PlaybackAdapter,
  AdapterPlaybackState,
  AdapterEventListener,
  validateAdapterOrigin,
} from "./adapter-interface";

export class YouTubeIFrameAdapter implements PlaybackAdapter {
  readonly id = "youtube";
  readonly name = "YouTube IFrame Player Adapter";
  readonly allowedDomains = ["youtube.com", "www.youtube.com", "youtu.be", "youtube-nocookie.com"];

  private player: any = null;
  private containerId: string | null = null;
  private listeners: Set<AdapterEventListener> = new Set();
  private pollInterval: any = null;
  private isDestroyed = false;

  private state: AdapterPlaybackState = {
    status: "uninitialized",
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    error: null,
  };

  async init(target: HTMLElement | string): Promise<void> {
    this.isDestroyed = false;
    const elementId = typeof target === "string" ? target : target.id;
    if (!elementId) {
      throw new Error("Target container must have an id attribute");
    }
    this.containerId = elementId;

    return new Promise((resolve, reject) => {
      const checkAndCreate = () => {
        if (this.isDestroyed) return;
        if (!window.YT || !window.YT.Player) {
          setTimeout(checkAndCreate, 100);
          return;
        }

        try {
          this.player = new window.YT.Player(this.containerId, {
            events: {
              onReady: () => {
                if (this.isDestroyed) return;
                this.state.status = "ready";
                this.state.duration = this.player?.getDuration?.() || 0;
                this.startPolling();
                this.notify();
                resolve();
              },
              onStateChange: (event: { data: number }) => {
                if (this.isDestroyed) return;
                this.handleYTStateChange(event.data);
              },
              onError: (event: { data: number }) => {
                if (this.isDestroyed) return;
                this.state.status = "error";
                this.state.error = `YouTube error code ${event.data}`;
                this.notify();
              },
            },
          });
        } catch (err) {
          reject(err);
        }
      };

      checkAndCreate();
    });
  }

  private handleYTStateChange(ytState: number) {
    if (!window.YT?.PlayerState) return;
    const PS = window.YT.PlayerState;

    switch (ytState) {
      case PS.PLAYING:
        this.state.status = "playing";
        break;
      case PS.PAUSED:
        this.state.status = "paused";
        break;
      case PS.BUFFERING:
        this.state.status = "buffering";
        break;
      case PS.ENDED:
        this.state.status = "ended";
        break;
    }
    this.syncCurrentTime();
    this.notify();
  }

  private startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      if (this.isDestroyed || !this.player) return;
      this.syncCurrentTime();
    }, 500);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private syncCurrentTime() {
    if (this.player && typeof this.player.getCurrentTime === "function") {
      try {
        this.state.currentTime = this.player.getCurrentTime();
        this.state.duration = this.player.getDuration() || this.state.duration;
      } catch {}
    }
  }

  async play(): Promise<void> {
    if (!this.player) throw new Error("YouTube adapter not initialized");
    this.player.playVideo();
  }

  async pause(): Promise<void> {
    if (!this.player) throw new Error("YouTube adapter not initialized");
    this.player.pauseVideo();
  }

  async seek(timeInSeconds: number): Promise<void> {
    if (!this.player) throw new Error("YouTube adapter not initialized");
    this.player.seekTo(timeInSeconds, true);
    this.state.currentTime = timeInSeconds;
    this.notify();
  }

  async setPlaybackRate(rate: number): Promise<void> {
    if (!this.player) throw new Error("YouTube adapter not initialized");
    this.player.setPlaybackRate(rate);
    this.state.playbackRate = rate;
    this.notify();
  }

  getCurrentTime(): number {
    this.syncCurrentTime();
    return this.state.currentTime;
  }

  getDuration(): number {
    return this.state.duration;
  }

  getState(): AdapterPlaybackState {
    return { ...this.state };
  }

  subscribe(listener: AdapterEventListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.isDestroyed = true;
    this.stopPolling();
    if (this.player) {
      try {
        this.player.destroy();
      } catch {}
      this.player = null;
    }
    this.listeners.clear();
    this.state.status = "uninitialized";
  }

  private notify() {
    const copy = this.getState();
    this.listeners.forEach((l) => l(copy));
  }
}
