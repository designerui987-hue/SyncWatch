import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = await updateSession(request);

  // Protect /room/* routes – require an authenticated session or demo user cookie
  if (request.nextUrl.pathname.startsWith("/room/")) {
    const demoUser = request.cookies.get("syncwatch_user")?.value;
    if (demoUser) {
      return response;
    }

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

      const supabase = createServerClient(url, anonKey, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const redirectUrl = new URL("/auth", request.url);
        redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }
    } catch {
      const redirectUrl = new URL("/auth", request.url);
      redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
