import { describe, it, expect } from "vitest";
import {
  PROVIDER_REGISTRY,
  getProviderCapability,
  getImplementedProviders,
  isProviderSupportedOnPlatform,
} from "../lib/providers/registry";
import { ProviderId } from "../lib/providers/types";

describe("Provider Capability Registry Suite", () => {
  it("resolves all defined providers with required metadata", () => {
    const requiredProviders: ProviderId[] = [
      "youtube",
      "html5",
      "licensed_upload",
      "netflix",
      "jiohotstar",
      "prime_video",
    ];

    for (const pid of requiredProviders) {
      const cap = getProviderCapability(pid);
      expect(cap).not.toBeNull();
      expect(cap?.id).toBe(pid);
      expect(cap?.name.length).toBeGreaterThan(0);
      expect(cap?.allowedDomains.length).toBeGreaterThan(0);
      expect(cap?.legalNotice.length).toBeGreaterThan(0);
      expect(cap?.prohibitedActions.length).toBeGreaterThan(0);
    }
  });

  it("strictly distinguishes implemented from experimental and planned providers", () => {
    const youtube = getProviderCapability("youtube");
    expect(youtube?.integrationStatus).toBe("implemented");

    const html5 = getProviderCapability("html5");
    expect(html5?.integrationStatus).toBe("implemented");

    const netflix = getProviderCapability("netflix");
    expect(netflix?.integrationStatus).toBe("experimental");

    const hotstar = getProviderCapability("jiohotstar");
    expect(hotstar?.integrationStatus).toBe("planned");

    const prime = getProviderCapability("prime_video");
    expect(prime?.integrationStatus).toBe("planned");

    const implemented = getImplementedProviders();
    expect(implemented.map((p) => p.id)).toContain("youtube");
    expect(implemented.map((p) => p.id)).toContain("html5");
    expect(implemented.map((p) => p.id)).not.toContain("netflix");
    expect(implemented.map((p) => p.id)).not.toContain("jiohotstar");
  });

  it("accurately declares supported playback controls per provider", () => {
    const yt = getProviderCapability("youtube")!;
    expect(yt.controls.play).toBe(true);
    expect(yt.controls.pause).toBe(true);
    expect(yt.controls.seek).toBe(true);
    expect(yt.controls.playbackRate).toBe(true);

    const netflix = getProviderCapability("netflix")!;
    expect(netflix.controls.play).toBe(true);
    expect(netflix.controls.pause).toBe(true);
    expect(netflix.controls.seek).toBe(true);
    // Netflix standard player does not expose rate changes to external controllers
    expect(netflix.controls.playbackRate).toBe(false);
  });

  it("enforces platform support matrix and companion chat flags", () => {
    expect(isProviderSupportedOnPlatform("youtube", "desktopWeb")).toBe(true);
    expect(isProviderSupportedOnPlatform("youtube", "androidWeb")).toBe(true);

    // Netflix requires extension on desktop; mobile native app is unsupported
    const netflix = getProviderCapability("netflix")!;
    expect(netflix.platforms.desktopWeb.mode).toBe("extension");
    expect(netflix.platforms.iosWeb.mode).toBe("companion_chat_only");
    expect(netflix.platforms.androidWeb.mode).toBe("companion_chat_only");
    expect(netflix.platforms.mobileNativeApp.supported).toBe(false);
  });

  it("documents anti-piracy, zero-DRM-bypass and non-proxying prohibitions", () => {
    for (const cap of Object.values(PROVIDER_REGISTRY)) {
      expect(cap.prohibitedActions.length).toBeGreaterThan(0);
      const prohibitedStr = cap.prohibitedActions.join(" ").toLowerCase();
      const hasSecurityDisclaimer =
        prohibitedStr.includes("drm") ||
        prohibitedStr.includes("rip") ||
        prohibitedStr.includes("download") ||
        prohibitedStr.includes("sharing") ||
        prohibitedStr.includes("authoriz") ||
        prohibitedStr.includes("license");
      expect(hasSecurityDisclaimer, `Failed for provider ${cap.id}`).toBe(true);
    }
  });

  it("returns null for unknown provider queries", () => {
    expect(getProviderCapability("unknown_pirate_service")).toBeNull();
    expect(getProviderCapability("")).toBeNull();
  });
});
