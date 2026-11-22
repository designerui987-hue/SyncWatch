/**
 * Validates a redirect target to ensure it is strictly an internal, same-origin relative route.
 * Rejects protocol-relative (//evil.com, /\evil.com), external, and scheme-bearing URLs.
 */
export function safeRedirectUrl(
  rawUrl: string | null | undefined,
  fallback = "/"
): string {
  if (!rawUrl || typeof rawUrl !== "string") {
    return fallback;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return fallback;
  }

  // Must begin with a single slash, not followed by / or \ (protocol-relative)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.startsWith("/\\\\")) {
    return fallback;
  }

  // Reject ASCII control characters and whitespace
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return fallback;
  }

  // Parse against a dummy base origin to verify path isolation
  try {
    const dummyOrigin = "http://internal-guard.local";
    const parsed = new URL(trimmed, dummyOrigin);

    // If protocol was specified or host changed, reject
    if (parsed.origin !== dummyOrigin) {
      return fallback;
    }

    // Ensure path remains relative to root
    const safePath = parsed.pathname + parsed.search + parsed.hash;
    if (!safePath.startsWith("/") || safePath.startsWith("//") || safePath.startsWith("/\\")) {
      return fallback;
    }

    return safePath;
  } catch {
    return fallback;
  }
}
