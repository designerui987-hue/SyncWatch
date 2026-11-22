import { describe, it, expect } from "vitest";
import { evaluateWatchPartyAccess, AccessWizardInput } from "../lib/wizard/access-evaluator";

describe("Watch Party Access Wizard Suite", () => {
  it("evaluates YouTube and HTML5 as zero-cost in-app synchronization", () => {
    const input: AccessWizardInput = {
      provider: "youtube",
      viewerCount: 4,
      devices: ["desktop_chrome", "desktop_safari"],
      householdStatus: "different_households",
      entitlements: {
        hostHasSubscription: false,
        viewersWithSubscriptionCount: 0,
      },
    };

    const res = evaluateWatchPartyAccess(input);
    expect(res.status).toBe("ready");
    expect(res.options.length).toBeGreaterThan(0);
    expect(res.options[0].estimatedAdditionalCost).toBe("$0.00 (Free)");
    expect(res.options[0].feasibility).toBe("recommended");
    expect(res.zeroCredentialGuarantee).toContain("never requests or stores login credentials");
  });

  it("recommends shared household plan for Netflix viewers within screen limits", () => {
    const input: AccessWizardInput = {
      provider: "netflix",
      viewerCount: 2,
      devices: ["desktop_chrome"],
      householdStatus: "same_household",
      entitlements: {
        hostHasSubscription: true,
        viewersWithSubscriptionCount: 0,
        planTier: "standard_2screens",
      },
    };

    const res = evaluateWatchPartyAccess(input);
    expect(res.status).toBe("extension_required");
    const householdOpt = res.options.find((o) => o.id === "household_plan");
    expect(householdOpt).toBeDefined();
    expect(householdOpt?.feasibility).toBe("recommended");
    expect(householdOpt?.estimatedAdditionalCost).toBe("$0.00");
  });

  it("recommends plan upgrade when same-household viewers exceed current plan screen capacity", () => {
    const input: AccessWizardInput = {
      provider: "netflix",
      viewerCount: 4,
      devices: ["desktop_chrome"],
      householdStatus: "same_household",
      entitlements: {
        hostHasSubscription: true,
        viewersWithSubscriptionCount: 0,
        planTier: "standard_2screens", // 2 screens only
      },
    };

    const res = evaluateWatchPartyAccess(input);
    const householdOpt = res.options.find((o) => o.id === "household_plan");
    expect(householdOpt?.feasibility).toBe("additional_cost");
    expect(householdOpt?.estimatedAdditionalCost).toContain("Upgrade to Premium");
  });

  it("evaluates Extra Member slots for remote friends across different households", () => {
    const input: AccessWizardInput = {
      provider: "netflix",
      viewerCount: 2,
      devices: ["desktop_chrome", "desktop_safari"],
      householdStatus: "different_households",
      entitlements: {
        hostHasSubscription: true,
        viewersWithSubscriptionCount: 0,
      },
    };

    const res = evaluateWatchPartyAccess(input);
    const extraMemberOpt = res.options.find((o) => o.id === "extra_member_slot");
    expect(extraMemberOpt).toBeDefined();
    expect(extraMemberOpt?.legalBasis).toContain("Extra Member program");

    const independentOpt = res.options.find((o) => o.id === "independent_accounts");
    expect(independentOpt).toBeDefined();

    const freeAltOpt = res.options.find((o) => o.id === "free_alternative");
    expect(freeAltOpt).toBeDefined();
  });

  it("flags mobile OS sandbox restrictions when mobile devices are selected for OTT services", () => {
    const input: AccessWizardInput = {
      provider: "netflix",
      viewerCount: 3,
      devices: ["desktop_chrome", "ios_mobile", "android_mobile"],
      householdStatus: "different_households",
      entitlements: {
        hostHasSubscription: true,
        viewersWithSubscriptionCount: 1,
      },
    };

    const res = evaluateWatchPartyAccess(input);
    expect(res.platformLimitations.length).toBeGreaterThan(0);
    expect(res.platformLimitations[0]).toContain("Operating System Sandbox");
    expect(res.platformLimitations[0]).toContain("Companion Mode");
  });

  it("reports planned status honestly for JioHotstar and Prime Video", () => {
    const hotstarRes = evaluateWatchPartyAccess({
      provider: "jiohotstar",
      viewerCount: 2,
      devices: ["desktop_chrome"],
      householdStatus: "different_households",
      entitlements: { hostHasSubscription: true, viewersWithSubscriptionCount: 0 },
    });
    expect(hotstarRes.status).toBe("planned");
    expect(hotstarRes.options[0].feasibility).toBe("unsupported");

    const primeRes = evaluateWatchPartyAccess({
      provider: "prime_video",
      viewerCount: 2,
      devices: ["desktop_chrome"],
      householdStatus: "different_households",
      entitlements: { hostHasSubscription: true, viewersWithSubscriptionCount: 0 },
    });
    expect(primeRes.status).toBe("planned");
    expect(primeRes.options[0].feasibility).toBe("unsupported");
  });

  it("strictly preserves zero-credential guarantee across all providers", () => {
    for (const p of ["youtube", "html5", "licensed_upload", "netflix", "jiohotstar", "prime_video"] as const) {
      const res = evaluateWatchPartyAccess({
        provider: p,
        viewerCount: 2,
        devices: ["desktop_chrome"],
        householdStatus: "same_household",
        entitlements: { hostHasSubscription: true, viewersWithSubscriptionCount: 0 },
      });
      expect(res.zeroCredentialGuarantee.length).toBeGreaterThan(0);
      expect(res.zeroCredentialGuarantee.toLowerCase()).toContain("never");
    }
  });
});
