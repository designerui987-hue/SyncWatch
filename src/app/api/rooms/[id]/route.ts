import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateRoomSchema } from "@/lib/validations/room";
import type { ApiError } from "@/types";

interface Params {
  params: { id: string };
}

function normalizeProvider(vType?: string) {
  if (vType === "direct") return "html5";
  if (
    vType &&
    ["youtube", "html5", "licensed_upload", "netflix", "jiohotstar", "prime_video"].includes(vType)
  ) {
    return vType as any;
  }
  return "youtube";
}

// ─── GET /api/rooms/[id] ──────────────────────────────────────────────────────

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

  const { data: room, error } = await supabase
    .from("rooms")
    .select("*, room_members!inner(user_id)")
    .eq("id", params.id)
    .eq("room_members.user_id", user.id)
    .single();

  if (error || !room) {
    return NextResponse.json(
      { error: "Room not found or access denied" } satisfies ApiError,
      { status: 404 }
    );
  }

  return NextResponse.json({
    room: {
      ...room,
      visibility: room.is_private ? "private" : "public",
      provider: normalizeProvider(room.video_type),
    },
  });
}

// ─── PATCH /api/rooms/[id] ────────────────────────────────────────────────────

export async function PATCH(
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

  // Verify caller is room host
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("host_id")
    .eq("id", params.id)
    .single();

  if (roomError || !room || room.host_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden: Only the room host can modify room settings" } satisfies ApiError,
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" } satisfies ApiError, { status: 400 });
  }

  const parsed = updateRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() } satisfies ApiError,
      { status: 422 }
    );
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.videoUrl !== undefined) updateData.video_url = parsed.data.videoUrl || null;

  // IMPORTANT: visibility is a database-generated column from is_private.
  // We MUST update is_private, and NEVER attempt writing to visibility directly.
  if (parsed.data.visibility !== undefined) {
    updateData.is_private = parsed.data.visibility === "private";
  }

  // Normalize provider to database column video_type ('youtube' | 'direct')
  if (parsed.data.provider !== undefined) {
    updateData.video_type = parsed.data.provider === "youtube" ? "youtube" : "direct";
    updateData.provider = parsed.data.provider;
  }

  const { data: updated, error: updateError } = await supabase
    .from("rooms")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Failed to update room", details: updateError?.message } satisfies ApiError,
      { status: 500 }
    );
  }

  return NextResponse.json({
    room: {
      ...updated,
      visibility: updated.is_private ? "private" : "public",
      provider: normalizeProvider(updated.video_type),
    },
  });
}
