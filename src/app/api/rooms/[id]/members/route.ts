import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

interface Params {
  params: { id: string };
}

// ─── GET /api/rooms/[id]/members ──────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
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

  const { data: callerMember } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!callerMember) {
    return NextResponse.json({ error: "Forbidden" } satisfies ApiError, { status: 403 });
  }

  const { data: members, error } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", params.id)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch members" } satisfies ApiError,
      { status: 500 }
    );
  }

  return NextResponse.json({ members });
}

// ─── DELETE /api/rooms/[id]/members?userId=... ────────────────────────────────

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

  const { data: callerMember } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!callerMember || callerMember.role !== "host") {
    return NextResponse.json(
      { error: "Forbidden: host only" } satisfies ApiError,
      { status: 403 }
    );
  }

  const targetUserId = new URL(request.url).searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json(
      { error: "userId query param required" } satisfies ApiError,
      { status: 400 }
    );
  }

  if (targetUserId === user.id) {
    return NextResponse.json(
      { error: "Cannot remove yourself" } satisfies ApiError,
      { status: 400 }
    );
  }

  const { error: deleteError } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", params.id)
    .eq("user_id", targetUserId);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to remove member" } satisfies ApiError,
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
