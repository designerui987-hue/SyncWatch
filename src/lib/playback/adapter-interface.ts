export type AdapterStatus = "uninitialized" | "ready" | "playing" | "paused" | "buffering" | "ended" | "error";

export interface AdapterPlaybackState {
  status: AdapterStatus;
  currentTime: number;
  duration: number;
  playbackRate: number;
  error?: string | null;
}

export type AdapterEventListener = (state: AdapterPlaybackState) => void;

export interface PlaybackAdapter {
  readonly id: string;
  readonly name: string;
  readonly allowedDomains: string[];

  init(target: HTMLElement | string): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(timeInSeconds: number): Promise<void>;
  setPlaybackRate(rate: number): Promise<void>;
  getCurrentTime(): number;
  getDuration(): number;
  getState(): AdapterPlaybackState;
  subscribe(listener: AdapterEventListener): () => void;
  destroy(): void;
}

/**
 * Validates whether a media URL or target domain conforms strictly to the provider's allowed domains.
 * Prevents SSRF, unauthorized origin access, and malicious domain injection.
 */
export function validateAdapterOrigin(rawUrl: string, allowedDomains: string[]): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  if (allowedDomains.includes("*")) {
    try {
      const parsed = new URL(rawUrl);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }

  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
