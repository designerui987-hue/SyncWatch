import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import type { InviteTokenResponse, ApiError } from "@/types";

interface Params {
  params: { id: string };
}

/**
 * POST /api/rooms/[id]/invite
 * Generate a new invite token for the room (host / co-host only).
 */
export async function POST(
  _request: NextRequest,
  { params }: Params
): Promise<NextResponse<InviteTokenResponse | ApiError>> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!member || !["host", "co-host"].includes(member.role)) {
    return NextResponse.json(
      { error: "Forbidden: host or co-host required" },
      { status: 403 }
    );
  }

  const token = nanoid(16);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from("rooms")
    .update({ invite_token: token, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to generate invite token" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return NextResponse.json({
    token,
    invite_url: `${appUrl}/invite/${token}`,
    expires_at: expiresAt,
  });
}
