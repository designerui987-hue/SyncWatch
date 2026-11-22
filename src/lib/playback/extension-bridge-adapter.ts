import {
  PlaybackAdapter,
  AdapterPlaybackState,
  AdapterEventListener,
  validateAdapterOrigin,
} from "./adapter-interface";

export interface ExtensionMessagePayload {
  type: "SYNCWATCH_COMMAND" | "SYNCWATCH_HEARTBEAT" | "SYNCWATCH_HANDSHAKE" | "SYNCWATCH_ERROR";
  roomId: string;
  sessionToken: string;
  action?: "play" | "pause" | "seek" | "rate";
  currentTime?: number;
  duration?: number;
  playbackRate?: number;
  status?: AdapterPlaybackState["status"];
  error?: string;
}

export class ExtensionBridgeAdapter implements PlaybackAdapter {
  readonly id = "extension_bridge";
  readonly name = "SyncWatch Companion Extension Adapter";
  readonly allowedDomains = ["*"];

  private listeners: Set<AdapterEventListener> = new Set();
  private roomId: string;
  private sessionToken: string;
  private targetWindow: Window | null = null;
  private isDestroyed = false;

  private state: AdapterPlaybackState = {
    status: "uninitialized",
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    error: null,
  };

  constructor(roomId: string, sessionToken: string) {
    this.roomId = roomId;
    this.sessionToken = sessionToken;
  }

  private boundMessageHandler = (event: MessageEvent) => {
    if (this.isDestroyed) return;

    // Strict same-origin or authorized extension origin check
    const data: ExtensionMessagePayload = event.data;
    if (!data || typeof data !== "object") return;
    if (data.roomId !== this.roomId || data.sessionToken !== this.sessionToken) {
      // Discard unauthorized or out-of-scope messages
      return;
    }

    if (data.type === "SYNCWATCH_HEARTBEAT") {
      this.state.currentTime = data.currentTime ?? this.state.currentTime;
      this.state.duration = data.duration ?? this.state.duration;
      this.state.status = data.status ?? this.state.status;
      this.notify();
    } else if (data.type === "SYNCWATCH_ERROR") {
      this.state.status = "error";
      this.state.error = data.error || "Extension playback error";
      this.notify();
    }
  };

  async init(target: HTMLElement | string): Promise<void> {
    this.isDestroyed = false;
    if (typeof window !== "undefined") {
      window.addEventListener("message", this.boundMessageHandler);
      // Dispatch handshake ping to extension
      window.postMessage(
        {
          type: "SYNCWATCH_HANDSHAKE",
          roomId: this.roomId,
          sessionToken: this.sessionToken,
        } satisfies ExtensionMessagePayload,
        "*"
      );
    }
    this.state.status = "ready";
    this.notify();
  }

  async play(): Promise<void> {
    this.sendCommand({ action: "play" });
    this.state.status = "playing";
    this.notify();
  }

  async pause(): Promise<void> {
    this.sendCommand({ action: "pause" });
    this.state.status = "paused";
    this.notify();
  }

  async seek(timeInSeconds: number): Promise<void> {
    this.sendCommand({ action: "seek", currentTime: timeInSeconds });
    this.state.currentTime = timeInSeconds;
    this.notify();
  }

  async setPlaybackRate(rate: number): Promise<void> {
    this.sendCommand({ action: "rate", playbackRate: rate });
    this.state.playbackRate = rate;
    this.notify();
  }

  getCurrentTime(): number {
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
    if (typeof window !== "undefined") {
      window.removeEventListener("message", this.boundMessageHandler);
    }
    this.listeners.clear();
    this.state.status = "uninitialized";
  }

  private sendCommand(params: Partial<ExtensionMessagePayload>) {
    if (typeof window !== "undefined") {
      window.postMessage(
        {
          type: "SYNCWATCH_COMMAND",
          roomId: this.roomId,
          sessionToken: this.sessionToken,
          ...params,
        } satisfies ExtensionMessagePayload,
        "*"
      );
    }
  }

  private notify() {
    const copy = this.getState();
    this.listeners.forEach((l) => l(copy));
  }
}
