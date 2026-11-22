import { z } from "zod";

export type ContentLicenseType =
  | "public_domain"
  | "creator_owned"
  | "creative_commons"
  | "licensed_partner"
  | "standard_web";

export interface LicenseDeclaration {
  licenseType: ContentLicenseType;
  authorName: string;
  licenseUrl?: string;
  authorizationProofNote?: string;
  authorizedForSyncWatch: boolean;
  dmcaNoticeAccepted: boolean;
  verifiedAt?: string;
}

export const licenseDeclarationSchema = z.object({
  licenseType: z.enum([
    "public_domain",
    "creator_owned",
    "creative_commons",
    "licensed_partner",
    "standard_web",
  ]),
  authorName: z.string().min(1, "Author or copyright holder name is required").max(120),
  licenseUrl: z.string().url().optional().or(z.literal("")),
  authorizationProofNote: z.string().max(500).optional(),
  authorizedForSyncWatch: z.literal(true, {
    errorMap: () => ({ message: "Must affirm express authorization to distribute this media" }),
  }),
  dmcaNoticeAccepted: z.literal(true, {
    errorMap: () => ({ message: "Must acknowledge DMCA and copyright compliance policy" }),
  }),
});

export function validateLicenseDeclaration(declaration: unknown): {
  isValid: boolean;
  data?: LicenseDeclaration;
  errors: string[];
} {
  const result = licenseDeclarationSchema.safeParse(declaration);
  if (!result.success) {
    return {
      isValid: false,
      errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
    };
  }
  return {
    isValid: true,
    data: result.data as LicenseDeclaration,
    errors: [],
  };
}
