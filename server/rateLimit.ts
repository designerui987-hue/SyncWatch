export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

interface BucketEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private buckets = new Map<string, BucketEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.buckets.get(key);

    if (!entry || entry.resetTime <= now) {
      this.buckets.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count < this.maxRequests) {
      entry.count += 1;
      return true;
    }

    return false;
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.buckets.entries()) {
      if (entry.resetTime <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
