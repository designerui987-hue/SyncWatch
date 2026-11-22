import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-role-key";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface VerifiedUser {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string | null;
}

/**
 * Verifies a Supabase JWT access token server-side using the Supabase Admin client.
 * Returns null if the token is invalid, expired, or verification fails.
 * No production fallbacks or arbitrary demo tokens are accepted.
 */
export async function verifyUserToken(token: string): Promise<VerifiedUser | null> {
  if (!token || typeof token !== "string" || token.trim() === "") {
    return null;
  }

  // Strict testing fixture only (never enabled in production)
  if (
    process.env.NODE_ENV === "test" &&
    token.startsWith("test-fixture-token-")
  ) {
    const id = token.replace("test-fixture-token-", "");
    return {
      id,
      email: `${id}@test.fixture`,
      displayName: `Test User ${id.slice(0, 6)}`,
      avatarUrl: null,
    };
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName:
        (user.user_metadata?.display_name as string) ||
        (user.user_metadata?.full_name as string) ||
        user.email?.split("@")[0] ||
        "Participant",
      avatarUrl: (user.user_metadata?.avatar_url as string) || null,
    };
  } catch {
    return null;
  }
}
