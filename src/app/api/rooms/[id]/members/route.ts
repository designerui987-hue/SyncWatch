import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { ApiError } from "@/types";

interface Params {
  params: { id: string };
}

const updateMemberRoleSchema = z.object({
  userId: z.string().uuid().or(z.string().min(1)),
  role: z.enum(["co-host", "viewer"]),
});

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

  // Caller must be an active member or host of the room
  const { data: callerMember } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!callerMember) {
    return NextResponse.json({ error: "Forbidden: Not a room member" } satisfies ApiError, { status: 403 });
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

// ─── PATCH /api/rooms/[id]/members (Role Changes) ─────────────────────────────

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

  // Only the room HOST can promote or demote members
  const { data: callerMember } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!callerMember || callerMember.role !== "host") {
    return NextResponse.json(
      { error: "Forbidden: Only the room host can modify member roles" } satisfies ApiError,
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" } satisfies ApiError, { status: 400 });
  }

  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() } satisfies ApiError,
      { status: 422 }
    );
  }

  const { userId: targetUserId, role: newRole } = parsed.data;

  // Prevent demoting the room host
  const { data: targetMember } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", params.id)
    .eq("user_id", targetUserId)
    .single();

  if (!targetMember) {
    return NextResponse.json({ error: "Target member not found in this room" } satisfies ApiError, { status: 404 });
  }

  if (targetMember.role === "host") {
    return NextResponse.json({ error: "Cannot modify the host's role" } satisfies ApiError, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("room_members")
    .update({ role: newRole })
    .eq("room_id", params.id)
    .eq("user_id", targetUserId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Failed to update member role" } satisfies ApiError, { status: 500 });
  }

  return NextResponse.json({ member: updated });
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

  const targetUserId = new URL(request.url).searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json(
      { error: "userId query parameter required" } satisfies ApiError,
      { status: 400 }
    );
  }

  // Check caller role
  const { data: callerMember } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!callerMember) {
    return NextResponse.json({ error: "Forbidden: Not a room member" } satisfies ApiError, { status: 403 });
  }

  const isSelf = targetUserId === user.id;

  // Self leaving room:
  if (isSelf) {
    if (callerMember.role === "host") {
      return NextResponse.json(
        { error: "Room host cannot leave room. Delete the room to end it." } satisfies ApiError,
        { status: 400 }
      );
    }
  } else {
    // Kicking another member: ONLY host is permitted
    if (callerMember.role !== "host") {
      return NextResponse.json(
        { error: "Forbidden: Only the host may kick other members" } satisfies ApiError,
        { status: 403 }
      );
    }
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
