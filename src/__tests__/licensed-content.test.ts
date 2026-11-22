import { describe, it, expect } from "vitest";
import { validateLicenseDeclaration } from "../lib/licensing/types";

describe("Licensed Content & Authorization Verification Suite", () => {
  it("validates legitimate public domain declarations", () => {
    const validPD = {
      licenseType: "public_domain",
      authorName: "Blender Foundation / Public Archive",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      authorizationProofNote: "Released under Creative Commons Zero / Public Domain",
      authorizedForSyncWatch: true,
      dmcaNoticeAccepted: true,
    };

    const res = validateLicenseDeclaration(validPD);
    expect(res.isValid).toBe(true);
    expect(res.data?.licenseType).toBe("public_domain");
    expect(res.data?.authorName).toBe("Blender Foundation / Public Archive");
    expect(res.errors).toHaveLength(0);
  });

  it("validates creator-owned authorizations", () => {
    const validCreator = {
      licenseType: "creator_owned",
      authorName: "Independent Filmmaker Jane Doe",
      authorizationProofNote: "Direct copyright owner grants non-exclusive watch party broadcast rights",
      authorizedForSyncWatch: true,
      dmcaNoticeAccepted: true,
    };

    const res = validateLicenseDeclaration(validCreator);
    expect(res.isValid).toBe(true);
    expect(res.data?.licenseType).toBe("creator_owned");
  });

  it("rejects declarations missing author name", () => {
    const invalid = {
      licenseType: "public_domain",
      authorName: "",
      authorizedForSyncWatch: true,
      dmcaNoticeAccepted: true,
    };

    const res = validateLicenseDeclaration(invalid);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("authorName"))).toBe(true);
  });

  it("rejects declarations that refuse DMCA acknowledgement or authorization affirmation", () => {
    const invalidAuth = {
      licenseType: "creator_owned",
      authorName: "Some Creator",
      authorizedForSyncWatch: false, // Refused affirmation
      dmcaNoticeAccepted: true,
    };

    const res = validateLicenseDeclaration(invalidAuth);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("authorizedForSyncWatch"))).toBe(true);

    const invalidDMCA = {
      licenseType: "creator_owned",
      authorName: "Some Creator",
      authorizedForSyncWatch: true,
      dmcaNoticeAccepted: false, // Refused DMCA policy
    };

    const res2 = validateLicenseDeclaration(invalidDMCA);
    expect(res2.isValid).toBe(false);
    expect(res2.errors.some((e) => e.includes("dmcaNoticeAccepted"))).toBe(true);
  });

  it("rejects invalid license types", () => {
    const invalidType = {
      licenseType: "pirated_cam_rip",
      authorName: "Anonymous",
      authorizedForSyncWatch: true,
      dmcaNoticeAccepted: true,
    };

    const res = validateLicenseDeclaration(invalidType);
    expect(res.isValid).toBe(false);
  });
});
