import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateDrift,
  shouldCorrectDrift,
  evaluatePlaybackSync,
} from "../../server/playback";

describe("Server-Authoritative Playback Synchronization", () => {
  it("calculates drift correctly between server and client", () => {
    expect(calculateDrift(10000, 10200)).toBe(200);
    expect(calculateDrift(5000, 4200)).toBe(800);
    expect(calculateDrift(1500, 1500)).toBe(0);
  });

  it("identifies drift within acceptable tolerance (<= 1000ms)", () => {
    expect(shouldCorrectDrift(500)).toBe(false);
    expect(shouldCorrectDrift(999)).toBe(false);
    expect(shouldCorrectDrift(1000)).toBe(false);
  });

  it("identifies when drift exceeds correction threshold (> 1000ms)", () => {
    expect(shouldCorrectDrift(1001)).toBe(true);
    expect(shouldCorrectDrift(3500)).toBe(true);
  });

  it("evaluates complete sync assessment correctly", () => {
    const assessment = evaluatePlaybackSync(5000, 2000, 1000);
    expect(assessment.driftMs).toBe(3000);
    expect(assessment.requiresCorrection).toBe(true);
    expect(typeof assessment.serverTimestamp).toBe("number");
  });
});
