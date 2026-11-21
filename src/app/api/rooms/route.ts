import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import type { CreateRoomResponse, ApiError } from "@/types";

const createRoomSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  videoUrl: z.string().url().optional().or(z.literal("")),
  provider: z.enum(["youtube", "html5"]).default("youtube"),
});

// Simple in-memory rate limiter: max 5 rooms per user per minute.
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || entry.reset < now) {
    rateLimitMap.set(userId, { count: 1, reset: now + 60_000 });
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

  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { name, description, visibility, videoUrl, provider } = parsed.data;

  const { data: room, error: insertError } = await supabase
    .from("rooms")
    .insert({
      name,
      description: description ?? null,
      host_id: user.id,
      visibility,
      video_url: videoUrl || null,
      provider,
      invite_token: nanoid(16),
    })
    .select()
    .single();

  if (insertError || !room) {
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }

  // Auto-add host as a member.
  await supabase.from("room_members").insert({
    room_id: room.id,
    user_id: user.id,
    role: "host",
    display_name:
      user.user_metadata?.display_name ?? user.email ?? "Host",
    avatar_url: user.user_metadata?.avatar_url ?? null,
  });

  return NextResponse.json({ room }, { status: 201 });
}
