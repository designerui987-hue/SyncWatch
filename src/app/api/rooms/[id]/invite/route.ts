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

  // 1. Verify caller is host or co-host
  const { data: member } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!member || !["host", "co-host"].includes(member.role)) {
    return NextResponse.json(
      { error: "Forbidden: host or co-host authorization required" },
      { status: 403 }
    );
  }

  const token = nanoid(24);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // 2. Insert into invite_tokens table
  const { error: insertError } = await supabase
    .from("invite_tokens")
    .insert({
      room_id: params.id,
      token,
      created_by: user.id,
      expires_at: expiresAt,
      max_uses: null,
      uses: 0,
    });

  if (insertError) {
    return NextResponse.json({ error: "Failed to create secure invite token" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return NextResponse.json({
    token,
    invite_url: `${appUrl}/invite/${token}`,
    expires_at: expiresAt,
  });
}

/**
 * DELETE /api/rooms/[id]/invite?token=...
 * Revoke an existing invite token (host / co-host only).
 */
export async function DELETE(
  request: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
  }

  const { data: member } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!member || !["host", "co-host"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" } satisfies ApiError, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tokenToRevoke = searchParams.get("token");

  if (!tokenToRevoke) {
    return NextResponse.json({ error: "Missing token parameter" } satisfies ApiError, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("invite_tokens")
    .delete()
    .eq("room_id", params.id)
    .eq("token", tokenToRevoke);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to revoke token" } satisfies ApiError, { status: 500 });
  }

  return NextResponse.json({ success: true, revoked: tokenToRevoke });
}
