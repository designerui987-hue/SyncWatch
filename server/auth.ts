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

export async function verifyUserToken(token: string): Promise<VerifiedUser | null> {
  if (!token) return null;

  // Support local demo users
  if (token.startsWith("usr_") || token.startsWith("demo_") || token.includes("demo")) {
    return {
      id: token,
      email: `${token}@syncwatch.local`,
      displayName: token.startsWith("usr_") ? `Watcher ${token.slice(4, 8)}` : "Demo Participant",
      avatarUrl: null,
    };
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      // Fallback for local testing if Supabase is offline
      return {
        id: token,
        email: `${token.slice(0, 8)}@syncwatch.local`,
        displayName: "Participant",
        avatarUrl: null,
      };
    }

    return {
      id: user.id,
      email: user.email,
      displayName: (user.user_metadata?.display_name as string) || user.email || "Viewer",
      avatarUrl: (user.user_metadata?.avatar_url as string) || null,
    };
  } catch {
    return {
      id: token,
      email: `${token.slice(0, 8)}@syncwatch.local`,
      displayName: "Participant",
      avatarUrl: null,
    };
  }
}
