import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter } from "../../server/rateLimit";

describe("Per-Socket / Endpoint Rate Limiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      windowMs: 1000,
      maxRequests: 3,
    });
  });

  it("allows requests up to the max threshold", () => {
    const key = "user-socket-123";
    expect(limiter.isAllowed(key)).toBe(true);
    expect(limiter.isAllowed(key)).toBe(true);
    expect(limiter.isAllowed(key)).toBe(true);
  });

  it("blocks requests that exceed the limit within window", () => {
    const key = "user-socket-456";
    expect(limiter.isAllowed(key)).toBe(true);
    expect(limiter.isAllowed(key)).toBe(true);
    expect(limiter.isAllowed(key)).toBe(true);
    expect(limiter.isAllowed(key)).toBe(false);
  });

  it("allows clearing or resetting a rate limit key", () => {
    const key = "user-socket-789";
    limiter.isAllowed(key);
    limiter.isAllowed(key);
    limiter.isAllowed(key);
    expect(limiter.isAllowed(key)).toBe(false);

    limiter.reset(key);
    expect(limiter.isAllowed(key)).toBe(true);
  });
});
