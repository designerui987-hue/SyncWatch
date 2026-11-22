import { ProviderId } from "../providers/types";
import { getProviderCapability } from "../providers/registry";

export type HouseholdStatus = "same_household" | "different_households" | "mixed";
export type DeviceType = "desktop_chrome" | "desktop_safari" | "android_mobile" | "ios_mobile" | "ipad_tablet";

export interface PlanEntitlements {
  hostHasSubscription: boolean;
  viewersWithSubscriptionCount: number; // Excluding host
  planTier?: "free" | "standard_2screens" | "premium_4screens";
}

export interface AccessWizardInput {
  provider: ProviderId;
  contentTitle?: string;
  viewerCount: number;
  devices: DeviceType[];
  householdStatus: HouseholdStatus;
  entitlements: PlanEntitlements;
}

export interface AccessOption {
  id: string;
  title: string;
  badge: "zero_cost" | "shared_plan" | "extra_member" | "independent_subs" | "alternative";
  description: string;
  feasibility: "recommended" | "feasible" | "additional_cost" | "unsupported";
  estimatedAdditionalCost: string;
  legalBasis: string;
  technicalRequirements: string[];
  recommendedAction: string;
}

export interface EvaluationResult {
  provider: ProviderId;
  status: "ready" | "extension_required" | "planned" | "needs_licensing";
  zeroCredentialGuarantee: string;
  options: AccessOption[];
  platformLimitations: string[];
  prohibitedActionsNotice: string;
}

export function evaluateWatchPartyAccess(input: AccessWizardInput): EvaluationResult {
  const cap = getProviderCapability(input.provider);
  const options: AccessOption[] = [];
  const platformLimitations: string[] = [];

  const hasMobile = input.devices.some((d) => d === "android_mobile" || d === "ios_mobile" || d === "ipad_tablet");
  const hasDesktop = input.devices.some((d) => d === "desktop_chrome" || d === "desktop_safari");

  // 1. Check Platform Sandbox Constraints
  if (hasMobile && (input.provider === "netflix" || input.provider === "prime_video" || input.provider === "jiohotstar")) {
    platformLimitations.push(
      "Mobile Operating System Sandbox: iOS and Android security sandboxes prevent mobile web browsers or extensions from injecting playback control into native streaming apps. Mobile attendees will participate in Companion Mode (live chat, sync timestamps, and manual sync countdown)."
    );
  }

  // 2. Provider-Specific Evaluation
  if (input.provider === "youtube" || input.provider === "html5") {
    options.push({
      id: "free_embedded",
      title: "Direct In-App Synchronized Playback",
      badge: "zero_cost",
      description: "All participants can watch simultaneously inside SyncWatch with full play, pause, seek, and drift-correction controls.",
      feasibility: "recommended",
      estimatedAdditionalCost: "$0.00 (Free)",
      legalBasis: "Publicly available media distributed via authorized standard web players or YouTube IFrame API.",
      technicalRequirements: ["Standard modern web browser (desktop or mobile)"],
      recommendedAction: "Create room and begin watching immediately",
    });

    return {
      provider: input.provider,
      status: "ready",
      zeroCredentialGuarantee: "SyncWatch never requests or stores login credentials for YouTube or direct media.",
      options,
      platformLimitations,
      prohibitedActionsNotice: "No stream ripping, ad bypass, or unauthorized re-broadcasting allowed.",
    };
  }

  if (input.provider === "licensed_upload") {
    options.push({
      id: "licensed_shared",
      title: "Authorized Creator / Public Domain Stream",
      badge: "zero_cost",
      description: "Streams verified under Creative Commons, open public licenses, or documented creator authorization.",
      feasibility: "recommended",
      estimatedAdditionalCost: "$0.00",
      legalBasis: "Explicit copyright permission, Creative Commons license, or Public Domain status.",
      technicalRequirements: ["Valid license attribution declaration attached to room"],
      recommendedAction: "Attach license certificate/attribution and initiate room",
    });

    return {
      provider: "licensed_upload",
      status: "ready",
      zeroCredentialGuarantee: "SyncWatch never requires or stores credentials for licensed creator content. Distribution is verified with copyright holder authorization.",
      options,
      platformLimitations,
      prohibitedActionsNotice: "Commercial pirated uploads are strictly prohibited and subject to immediate DMCA takedown.",
    };
  }

  if (input.provider === "netflix") {
    const totalViewers = Math.max(1, input.viewerCount);
    const viewersWithSub = input.entitlements.viewersWithSubscriptionCount;
    const unsubscribedCount = Math.max(0, totalViewers - (input.entitlements.hostHasSubscription ? 1 : 0) - viewersWithSub);

    // Option A: Same-household shared stream (if all in same household and within screen limits)
    if (input.householdStatus === "same_household" && input.entitlements.hostHasSubscription) {
      const maxScreens = input.entitlements.planTier === "premium_4screens" ? 4 : 2;
      const withinScreens = totalViewers <= maxScreens;

      options.push({
        id: "household_plan",
        title: "Shared Household Plan Viewing",
        badge: "shared_plan",
        description: `All ${totalViewers} viewers are in the same physical household using the host's existing plan (up to ${maxScreens} simultaneous screens).`,
        feasibility: withinScreens ? "recommended" : "additional_cost",
        estimatedAdditionalCost: withinScreens ? "$0.00" : "Upgrade to Premium ($6.99/mo difference for 4 screens)",
        legalBasis: "Netflix Terms of Service permit simultaneous streaming on devices within the same primary household.",
        technicalRequirements: [
          "Desktop browser with SyncWatch Companion Extension",
          "Each member selects their own household profile",
        ],
        recommendedAction: withinScreens
          ? "Connect SyncWatch Companion Extension on each household screen"
          : "Upgrade plan to Premium or have remaining viewers use independent profiles",
      });
    }

    // Option B: Extra Member Slot (for different households)
    if (input.householdStatus !== "same_household" && input.entitlements.hostHasSubscription && unsubscribedCount > 0) {
      options.push({
        id: "extra_member_slot",
        title: "Netflix Extra Member Slot Addition",
        badge: "extra_member",
        description: "Add an official 'Extra Member' slot to the host's Standard or Premium account for a friend residing outside the household.",
        feasibility: unsubscribedCount <= 2 ? "feasible" : "additional_cost",
        estimatedAdditionalCost: `~$7.99 - $8.99/mo per extra member slot (limit 1-2 depending on plan)`,
        legalBasis: "Netflix official Extra Member program allows external friends to have their own sub-account legally.",
        technicalRequirements: [
          "Host invites friend via Netflix Account settings",
          "Friend activates their independent credentials on netflix.com",
        ],
        recommendedAction: "Host purchases Extra Member slot via Netflix Account dashboard",
      });
    }

    // Option C: Independent Access (Everyone with their own login)
    options.push({
      id: "independent_accounts",
      title: "Individual Account Synchronization",
      badge: "independent_subs",
      description: `Each participant logs into their own personal Netflix account on their own device. SyncWatch synchronizes playback timestamps only.`,
      feasibility: unsubscribedCount === 0 ? "recommended" : "additional_cost",
      estimatedAdditionalCost: unsubscribedCount === 0 ? "$0.00" : `~$6.99/mo per unsubscribed friend (Standard with ads)`,
      legalBasis: "100% compliant with Netflix Terms of Service. No credentials or stream tokens are shared.",
      technicalRequirements: [
        "Each participant logs into their own account on netflix.com directly",
        "SyncWatch Companion Extension installed on desktop browsers",
      ],
      recommendedAction: "All members ensure active subscriptions, install extension, and join room",
    });

    // Option D: Free Licensed Alternative
    if (unsubscribedCount > 0) {
      options.push({
        id: "free_alternative",
        title: "Switch to YouTube or Licensed Media Alternative",
        badge: "alternative",
        description: "Watch a high-quality free or creator-licensed alternative together with zero paywalls for any attendee.",
        feasibility: "feasible",
        estimatedAdditionalCost: "$0.00",
        legalBasis: "Public domain or YouTube ad-supported media requiring no subscriptions.",
        technicalRequirements: ["No extensions required; works directly in any browser"],
        recommendedAction: "Select YouTube or direct video in room settings",
      });
    }

    return {
      provider: "netflix",
      status: "extension_required",
      zeroCredentialGuarantee: "SyncWatch never asks for, captures, or transmits your Netflix username, password, or cookies. All logins happen solely on official netflix.com domains.",
      options,
      platformLimitations,
      prohibitedActionsNotice: "Account password sharing across non-household members, DRM stripping, and stream re-broadcasting are strictly prohibited.",
    };
  }

  // Hotstar / Prime (Planned)
  options.push({
    id: "planned_service",
    title: `${cap?.name || input.provider} Integration Status: In Planning`,
    badge: "alternative",
    description: `Official integration for ${cap?.name || input.provider} is currently in planning. SyncWatch does not support unverified third-party scraping or unapproved stream playback.`,
    feasibility: "unsupported",
    estimatedAdditionalCost: "N/A",
    legalBasis: "Platform APIs and compliance mechanisms are undergoing partner and legal review.",
    technicalRequirements: ["Not yet supported for automatic playback control"],
    recommendedAction: "Use Companion Mode for chat/timing, or select YouTube/HTML5 for full automated sync",
  });

  return {
    provider: input.provider,
    status: "planned",
    zeroCredentialGuarantee: "SyncWatch will never ask for your streaming credentials.",
    options,
    platformLimitations,
    prohibitedActionsNotice: "DRM cracking and unauthorized account access are strictly prohibited.",
  };
}
