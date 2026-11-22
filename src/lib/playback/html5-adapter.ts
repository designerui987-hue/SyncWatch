import {
  PlaybackAdapter,
  AdapterPlaybackState,
  AdapterEventListener,
  validateAdapterOrigin,
} from "./adapter-interface";

export class Html5VideoAdapter implements PlaybackAdapter {
  readonly id = "html5";
  readonly name = "Direct HTML5 Video Adapter";
  readonly allowedDomains = ["*"];

  private videoElement: HTMLVideoElement | null = null;
  private listeners: Set<AdapterEventListener> = new Set();
  private state: AdapterPlaybackState = {
    status: "uninitialized",
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    error: null,
  };

  private boundOnPlay = () => this.updateStatus("playing");
  private boundOnPause = () => this.updateStatus("paused");
  private boundOnWaiting = () => this.updateStatus("buffering");
  private boundOnEnded = () => this.updateStatus("ended");
  private boundOnTimeUpdate = () => {
    if (!this.videoElement) return;
    this.state.currentTime = this.videoElement.currentTime;
    this.state.duration = this.videoElement.duration || 0;
    this.notify();
  };
  private boundOnError = () => {
    const errorMsg = this.videoElement?.error?.message || "HTML5 playback failed";
    this.state.error = errorMsg;
    this.updateStatus("error");
  };

  async init(target: HTMLElement | string): Promise<void> {
    if (typeof target === "string") {
      const el = document.getElementById(target);
      if (!(el instanceof HTMLVideoElement)) {
        throw new Error(`Target #${target} is not an HTMLVideoElement`);
      }
      this.videoElement = el;
    } else if (target instanceof HTMLVideoElement) {
      this.videoElement = target;
    } else {
      throw new Error("Invalid target: must be HTMLVideoElement or element id");
    }

    // Verify source URL if set
    if (this.videoElement.src && !validateAdapterOrigin(this.videoElement.src, this.allowedDomains)) {
      throw new Error("Invalid or unverified media source origin");
    }

    this.videoElement.addEventListener("play", this.boundOnPlay);
    this.videoElement.addEventListener("pause", this.boundOnPause);
    this.videoElement.addEventListener("waiting", this.boundOnWaiting);
    this.videoElement.addEventListener("playing", this.boundOnPlay);
    this.videoElement.addEventListener("ended", this.boundOnEnded);
    this.videoElement.addEventListener("timeupdate", this.boundOnTimeUpdate);
    this.videoElement.addEventListener("error", this.boundOnError);

    this.state = {
      status: "ready",
      currentTime: this.videoElement.currentTime,
      duration: this.videoElement.duration || 0,
      playbackRate: this.videoElement.playbackRate,
      error: null,
    };
    this.notify();
  }

  async play(): Promise<void> {
    if (!this.videoElement) throw new Error("Adapter not initialized");
    try {
      await this.videoElement.play();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        this.state.error = "Autoplay blocked by browser policy. User gesture required.";
        this.updateStatus("paused");
      }
      throw err;
    }
  }

  async pause(): Promise<void> {
    if (!this.videoElement) throw new Error("Adapter not initialized");
    this.videoElement.pause();
  }

  async seek(timeInSeconds: number): Promise<void> {
    if (!this.videoElement) throw new Error("Adapter not initialized");
    const target = Math.max(0, Math.min(timeInSeconds, this.getDuration() || timeInSeconds));
    this.videoElement.currentTime = target;
    this.state.currentTime = target;
    this.notify();
  }

  async setPlaybackRate(rate: number): Promise<void> {
    if (!this.videoElement) throw new Error("Adapter not initialized");
    this.videoElement.playbackRate = rate;
    this.state.playbackRate = rate;
    this.notify();
  }

  getCurrentTime(): number {
    return this.videoElement?.currentTime || this.state.currentTime;
  }

  getDuration(): number {
    return this.videoElement?.duration || this.state.duration;
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
    if (this.videoElement) {
      this.videoElement.removeEventListener("play", this.boundOnPlay);
      this.videoElement.removeEventListener("pause", this.boundOnPause);
      this.videoElement.removeEventListener("waiting", this.boundOnWaiting);
      this.videoElement.removeEventListener("playing", this.boundOnPlay);
      this.videoElement.removeEventListener("ended", this.boundOnEnded);
      this.videoElement.removeEventListener("timeupdate", this.boundOnTimeUpdate);
      this.videoElement.removeEventListener("error", this.boundOnError);
      this.videoElement = null;
    }
    this.listeners.clear();
    this.state.status = "uninitialized";
  }

  private updateStatus(status: AdapterPlaybackState["status"]) {
    this.state.status = status;
    if (this.videoElement) {
      this.state.currentTime = this.videoElement.currentTime;
      this.state.duration = this.videoElement.duration || 0;
    }
    this.notify();
  }

  private notify() {
    const copy = this.getState();
    this.listeners.forEach((l) => l(copy));
  }
}
