import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handle the OAuth / magic-link callback from Supabase.
 * Exchanges the authorization code for a session and redirects to the
 * intended page.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  // Something went wrong – redirect back to auth page with an error hint.
  return NextResponse.redirect(new URL("/auth?error=auth_failed", origin));
}
