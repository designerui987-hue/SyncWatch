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

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: (user.user_metadata?.display_name as string) || user.email || "Viewer",
      avatarUrl: (user.user_metadata?.avatar_url as string) || null,
    };
  } catch {
    return null;
  }
}
