export type ProviderId =
  | "youtube"
  | "html5"
  | "licensed_upload"
  | "netflix"
  | "jiohotstar"
  | "prime_video";

export type IntegrationStatus = "implemented" | "experimental" | "planned" | "unsupported";

export type PlaybackMode = "embedded" | "extension" | "companion_chat_only" | "unsupported";

export interface ControlCapability {
  play: boolean;
  pause: boolean;
  seek: boolean;
  playbackRate: boolean;
  volume: boolean;
  fullscreen: boolean;
}

export interface PlatformSupport {
  supported: boolean;
  mode: PlaybackMode;
  notes: string;
}

export interface PlatformMatrix {
  desktopWeb: PlatformSupport;
  macOS: PlatformSupport;
  windows: PlatformSupport;
  androidWeb: PlatformSupport;
  iosWeb: PlatformSupport;
  mobileNativeApp: PlatformSupport;
}

export interface AccessModel {
  type: "free" | "per_user_subscription" | "household_shared" | "licensed_upload";
  requiresIndividualLogin: boolean;
  householdRuleEnforced: boolean;
  concurrentStreamLimit?: number;
  description: string;
}

export interface ProviderCapability {
  id: ProviderId;
  name: string;
  tagline: string;
  integrationStatus: IntegrationStatus;
  allowedDomains: string[];
  controls: ControlCapability;
  platforms: PlatformMatrix;
  accessModel: AccessModel;
  legalNotice: string;
  prohibitedActions: string[];
}
