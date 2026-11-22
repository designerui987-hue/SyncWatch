import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { licenseDeclarationSchema } from "@/lib/licensing/types";
import type { CreateRoomResponse, ApiError } from "@/types";

const createRoomSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  videoUrl: z.string().url().optional().or(z.literal("")),
  provider: z
    .enum(["youtube", "html5", "licensed_upload", "netflix", "jiohotstar", "prime_video"])
    .default("youtube"),
  license: licenseDeclarationSchema.optional().nullable(),
});

// In-memory token bucket rate limiter: max 5 room creations per user per hour
const roomRateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRoomCreationRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = roomRateLimitMap.get(userId);
  if (!entry || entry.reset < now) {
    roomRateLimitMap.set(userId, { count: 1, reset: now + 3600_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateRoomResponse | ApiError>> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRoomCreationRateLimit(user.id)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. You may only create up to 5 rooms per hour." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { name, description, visibility, videoUrl, provider } = parsed.data;
  const isPrivate = visibility === "private";
  const videoType = provider === "youtube" ? "youtube" : "direct";

  // 1. Insert room into rooms table
  const { data: room, error: insertError } = await supabase
    .from("rooms")
    .insert({
      name,
      description: description || null,
      host_id: user.id,
      is_private: isPrivate,
      video_url: videoUrl || null,
      video_type: videoType,
    })
    .select()
    .single();

  if (insertError || !room) {
    return NextResponse.json(
      { error: "Failed to create room", details: insertError?.message },
      { status: 500 }
    );
  }

  // 2. Insert host into room_members (atomic trigger handles this, but upsert ensures client verification)
  const { error: memberError } = await supabase.from("room_members").upsert(
    {
      room_id: room.id,
      user_id: user.id,
      role: "host",
    },
    { onConflict: "room_id,user_id" }
  );

  if (memberError) {
    // If host membership failed, clean up the orphaned room to avoid inconsistent state
    await supabase.from("rooms").delete().eq("id", room.id);
    return NextResponse.json(
      { error: "Failed to establish host membership", details: memberError.message },
      { status: 500 }
    );
  }

  // 3. Create initial invite token in invite_tokens table
  const token = nanoid(24);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: tokenError } = await supabase.from("invite_tokens").insert({
    room_id: room.id,
    token,
    created_by: user.id,
    expires_at: expiresAt,
  });

  if (tokenError) {
    // Token generation failure is logged, but room is already functional
    console.error("Warning: Initial invite token creation failed:", tokenError);
  }

  return NextResponse.json(
    {
      room: {
        ...room,
        visibility: isPrivate ? "private" : "public",
        provider: videoType === "youtube" ? "youtube" : "html5",
        invite_token: tokenError ? null : token,
      },
    },
    { status: 201 }
  );
}
