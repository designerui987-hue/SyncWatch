import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { ApiError } from "@/types";

interface Params {
  params: { id: string };
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

  return NextResponse.json({ room });
}

// ─── PATCH /api/rooms/[id] ────────────────────────────────────────────────────

const updateRoomSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  videoUrl: z.string().url().optional().or(z.literal("")).optional(),
  provider: z.enum(["youtube", "html5"]).optional(),
});

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

  const { data: room } = await supabase
    .from("rooms")
    .select("host_id")
    .eq("id", params.id)
    .single();

  if (!room || room.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" } satisfies ApiError, { status: 403 });
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
  if (parsed.data.visibility !== undefined) updateData.visibility = parsed.data.visibility;
  if (parsed.data.videoUrl !== undefined) updateData.video_url = parsed.data.videoUrl || null;
  if (parsed.data.provider !== undefined) updateData.provider = parsed.data.provider;

  const { data: updated, error: updateError } = await supabase
    .from("rooms")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update room" } satisfies ApiError,
      { status: 500 }
    );
  }

  return NextResponse.json({ room: updated });
}
