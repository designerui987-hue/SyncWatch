import { ProviderCapability, ProviderId } from "./types";

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderCapability> = {
  youtube: {
    id: "youtube",
    name: "YouTube",
    tagline: "Free & Premium video streaming via official IFrame API",
    integrationStatus: "implemented",
    allowedDomains: ["youtube.com", "www.youtube.com", "youtu.be", "youtube-nocookie.com"],
    controls: {
      play: true,
      pause: true,
      seek: true,
      playbackRate: true,
      volume: true,
      fullscreen: true,
    },
    platforms: {
      desktopWeb: { supported: true, mode: "embedded", notes: "Full sync and embedded player support" },
      macOS: { supported: true, mode: "embedded", notes: "Full sync in desktop browsers and PWA" },
      windows: { supported: true, mode: "embedded", notes: "Full sync in desktop browsers and PWA" },
      androidWeb: { supported: true, mode: "embedded", notes: "Embedded player with user-gesture autoplay unlock" },
      iosWeb: { supported: true, mode: "embedded", notes: "Embedded player with user-gesture autoplay unlock" },
      mobileNativeApp: { supported: false, mode: "companion_chat_only", notes: "Cannot control native mobile YouTube app; use embedded web view" },
    },
    accessModel: {
      type: "free",
      requiresIndividualLogin: false,
      householdRuleEnforced: false,
      description: "Publicly accessible videos are free to watch. YouTube Premium features remain tied to individual user accounts.",
    },
    legalNotice: "SyncWatch utilizes the official YouTube IFrame Player API under YouTube Terms of Service. SyncWatch does not store, re-encode, or download YouTube videos.",
    prohibitedActions: [
      "Stream downloading or local caching",
      "Ad-blocking manipulation",
      "Circumventing age-gate or regional restrictions",
      "Re-broadcasting copyrighted content without license",
    ],
  },

  html5: {
    id: "html5",
    name: "Direct HTML5 Video",
    tagline: "Direct MP4/WebM/HLS streams from verified web hosts",
    integrationStatus: "implemented",
    allowedDomains: ["*"], // Validated dynamically against public/authorized origins
    controls: {
      play: true,
      pause: true,
      seek: true,
      playbackRate: true,
      volume: true,
      fullscreen: true,
    },
    platforms: {
      desktopWeb: { supported: true, mode: "embedded", notes: "Native HTML5 <video> with drift correction" },
      macOS: { supported: true, mode: "embedded", notes: "Full native browser and PWA support" },
      windows: { supported: true, mode: "embedded", notes: "Full native browser and PWA support" },
      androidWeb: { supported: true, mode: "embedded", notes: "Mobile browser video element with gesture-init" },
      iosWeb: { supported: true, mode: "embedded", notes: "Mobile Safari inline video support" },
      mobileNativeApp: { supported: true, mode: "embedded", notes: "Webview HTML5 playback supported" },
    },
    accessModel: {
      type: "free",
      requiresIndividualLogin: false,
      householdRuleEnforced: false,
      description: "Direct video assets accessible over HTTPS. Access control is managed by hosting origin.",
    },
    legalNotice: "Users must possess rights or permissions to distribute the media URL linked in room.",
    prohibitedActions: [
      "Hotlinking private streams without authorization",
      "Circumventing origin CORS or authentication headers",
    ],
  },

  licensed_upload: {
    id: "licensed_upload",
    name: "Licensed & Creator Media",
    tagline: "Public domain, Creative Commons, and creator-authorized media",
    integrationStatus: "implemented",
    allowedDomains: ["*"],
    controls: {
      play: true,
      pause: true,
      seek: true,
      playbackRate: true,
      volume: true,
      fullscreen: true,
    },
    platforms: {
      desktopWeb: { supported: true, mode: "embedded", notes: "Full embedded playback" },
      macOS: { supported: true, mode: "embedded", notes: "Full embedded playback" },
      windows: { supported: true, mode: "embedded", notes: "Full embedded playback" },
      androidWeb: { supported: true, mode: "embedded", notes: "Full embedded playback with gesture init" },
      iosWeb: { supported: true, mode: "embedded", notes: "Full embedded playback with playsinline" },
      mobileNativeApp: { supported: true, mode: "embedded", notes: "Webview supported" },
    },
    accessModel: {
      type: "licensed_upload",
      requiresIndividualLogin: false,
      householdRuleEnforced: false,
      description: "Media explicitly authorized under Creative Commons, Public Domain, or documented creator authorization.",
    },
    legalNotice: "Uploaded and referenced media must be accompanied by a verifiable license declaration (CC, Public Domain, or Written Authorization).",
    prohibitedActions: [
      "Uploading copyrighted commercial recordings without authorization",
      "Falsifying license declarations",
      "Circumventing DMCA takedown policies",
      "Unauthorized stream re-distribution",
    ],
  },

  netflix: {
    id: "netflix",
    name: "Netflix",
    tagline: "Subscription streaming synchronized via companion extension",
    integrationStatus: "experimental",
    allowedDomains: ["netflix.com", "www.netflix.com"],
    controls: {
      play: true,
      pause: true,
      seek: true,
      playbackRate: false, // Standard Netflix player limits speed change API
      volume: false,
      fullscreen: false,
    },
    platforms: {
      desktopWeb: {
        supported: true,
        mode: "extension",
        notes: "Requires desktop browser with SyncWatch Companion Extension. Every participant must be logged into their own active Netflix subscription/profile.",
      },
      macOS: {
        supported: true,
        mode: "extension",
        notes: "Supported on Chrome/Edge/Firefox desktop browsers via extension",
      },
      windows: {
        supported: true,
        mode: "extension",
        notes: "Supported on Chrome/Edge/Firefox desktop browsers via extension",
      },
      androidWeb: {
        supported: false,
        mode: "companion_chat_only",
        notes: "Mobile OS sandboxes prevent web browsers and extensions from controlling native Netflix apps. Mobile users participate in Companion Mode (chat and timecode display).",
      },
      iosWeb: {
        supported: false,
        mode: "companion_chat_only",
        notes: "iOS Safari sandbox strictly blocks cross-app playback injection. Mobile users participate in Companion Mode (chat and timecode display).",
      },
      mobileNativeApp: {
        supported: false,
        mode: "unsupported",
        notes: "Direct native mobile app IPC is not permitted by platform app store sandboxes.",
      },
    },
    accessModel: {
      type: "per_user_subscription",
      requiresIndividualLogin: true,
      householdRuleEnforced: true,
      concurrentStreamLimit: 4,
      description: "Every viewer must hold an active Netflix subscription or authorized household extra member profile. One subscription does NOT grant viewing rights to external friends.",
    },
    legalNotice: "SyncWatch DOES NOT bypass DRM, decrypt Widevine streams, proxy video data, or circumvent Netflix household policies. All participants stream directly from Netflix servers on their own authenticated accounts.",
    prohibitedActions: [
      "DRM circumvention or Widevine CDM hooking",
      "Video stream capture, proxying, or re-broadcasting",
      "Credential storage, phishing, or automated login bypass",
      "Falsifying geolocation or network identity to bypass household rules",
    ],
  },

  jiohotstar: {
    id: "jiohotstar",
    name: "JioHotstar",
    tagline: "Regional & Live sports streaming (Planned)",
    integrationStatus: "planned",
    allowedDomains: ["hotstar.com", "www.hotstar.com", "jiohotstar.com"],
    controls: {
      play: true,
      pause: true,
      seek: true,
      playbackRate: false,
      volume: false,
      fullscreen: false,
    },
    platforms: {
      desktopWeb: { supported: false, mode: "unsupported", notes: "Integration in planning; pending partner review & player compatibility verification" },
      macOS: { supported: false, mode: "unsupported", notes: "Unverified integration" },
      windows: { supported: false, mode: "unsupported", notes: "Unverified integration" },
      androidWeb: { supported: false, mode: "companion_chat_only", notes: "Companion chat only" },
      iosWeb: { supported: false, mode: "companion_chat_only", notes: "Companion chat only" },
      mobileNativeApp: { supported: false, mode: "unsupported", notes: "Native mobile app control unavailable" },
    },
    accessModel: {
      type: "per_user_subscription",
      requiresIndividualLogin: true,
      householdRuleEnforced: true,
      description: "Requires active individual subscription per viewer according to JioHotstar plan terms.",
    },
    legalNotice: "Planned integration. SyncWatch does not endorse or offer unauthorized access to JioHotstar content.",
    prohibitedActions: [
      "DRM decryption or Widevine cracking",
      "Restreaming live sports or broadcast feeds",
      "Subscription sharing across non-household accounts",
    ],
  },

  prime_video: {
    id: "prime_video",
    name: "Prime Video",
    tagline: "Amazon Prime Video streaming (Planned)",
    integrationStatus: "planned",
    allowedDomains: ["primevideo.com", "www.primevideo.com", "amazon.com"],
    controls: {
      play: true,
      pause: true,
      seek: true,
      playbackRate: false,
      volume: false,
      fullscreen: false,
    },
    platforms: {
      desktopWeb: { supported: false, mode: "unsupported", notes: "Integration in planning; player adapter not yet verified" },
      macOS: { supported: false, mode: "unsupported", notes: "Unverified integration" },
      windows: { supported: false, mode: "unsupported", notes: "Unverified integration" },
      androidWeb: { supported: false, mode: "companion_chat_only", notes: "Companion chat only" },
      iosWeb: { supported: false, mode: "companion_chat_only", notes: "Companion chat only" },
      mobileNativeApp: { supported: false, mode: "unsupported", notes: "Native mobile app control unavailable" },
    },
    accessModel: {
      type: "per_user_subscription",
      requiresIndividualLogin: true,
      householdRuleEnforced: true,
      concurrentStreamLimit: 3,
      description: "Requires independent Amazon Prime membership per viewer for non-household members.",
    },
    legalNotice: "Planned integration. SyncWatch respects Amazon digital rights management and terms of service.",
    prohibitedActions: [
      "Bypassing Amazon DRM or PlayReady/Widevine protections",
      "Re-streaming purchased or Prime catalog content",
      "Unauthorized account sharing",
    ],
  },
};

/**
 * Returns capability for a given provider, or null if unknown
 */
export function getProviderCapability(id: string): ProviderCapability | null {
  if (id in PROVIDER_REGISTRY) {
    return PROVIDER_REGISTRY[id as ProviderId];
  }
  return null;
}

/**
 * Returns list of verified implemented providers ready for in-app production use
 */
export function getImplementedProviders(): ProviderCapability[] {
  return Object.values(PROVIDER_REGISTRY).filter((p) => p.integrationStatus === "implemented");
}

/**
 * Checks whether a provider is verified and supported on the user's specific platform
 */
export function isProviderSupportedOnPlatform(
  providerId: ProviderId,
  platform: keyof ProviderCapability["platforms"]
): boolean {
  const cap = PROVIDER_REGISTRY[providerId];
  if (!cap) return false;
  return cap.platforms[platform].supported;
}
