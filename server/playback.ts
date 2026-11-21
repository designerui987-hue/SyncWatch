export interface PlaybackSyncAssessment {
  driftMs: number;
  requiresCorrection: boolean;
  serverTimestamp: number;
}

/**
 * Calculates drift between client playback position and authoritative server position.
 */
export function calculateDrift(
  serverPositionMs: number,
  clientPositionMs: number
): number {
  return Math.abs(serverPositionMs - clientPositionMs);
}

/**
 * Determines whether the client is out of tolerance threshold (> 1000ms drift).
 */
export function shouldCorrectDrift(driftMs: number, thresholdMs = 1000): boolean {
  return driftMs > thresholdMs;
}

export function evaluatePlaybackSync(
  serverAuthoritativePositionMs: number,
  clientReportedPositionMs: number,
  thresholdMs = 1000
): PlaybackSyncAssessment {
  const driftMs = calculateDrift(serverAuthoritativePositionMs, clientReportedPositionMs);
  return {
    driftMs,
    requiresCorrection: shouldCorrectDrift(driftMs, thresholdMs),
    serverTimestamp: Date.now(),
  };
}
