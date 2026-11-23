import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { RoomShell } from "@/components/room/RoomShell";
import type { Room, RoomMember, UserRole } from "@/types";

interface RoomPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: RoomPageProps) {
  return {
    title: `Watch Room - SyncWatch`,
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const supabase = createClient();

  // 1. Enforce authenticated Supabase user (or local dev user in development)
  const {
    data: { user: supabaseUser },
    error: authError,
  } = await supabase.auth.getUser();

  let user = supabaseUser;

  if (!user && process.env.NODE_ENV === "development") {
    const cookieStore = cookies();
    const demoCookie = cookieStore.get("syncwatch_user")?.value;
    if (demoCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(demoCookie));
        user = {
          id: parsed.id,
          email: parsed.email,
          user_metadata: {
            display_name: parsed.displayName,
          },
        } as any;
      } catch {}
    }
  }

  if (!user) {
    redirect(`/auth?redirectTo=/room/${params.id}`);
  }

  const currentUser = {
    id: user.id,
    email: user.email ?? "",
    displayName:
      (user.user_metadata?.display_name as string) ||
      (user.user_metadata?.full_name as string) ||
      user.email?.split("@")[0] ||
      "Participant",
    avatarUrl: (user.user_metadata?.avatar_url as string) || null,
  };

  // 2. Fetch Room from Database
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", params.id)
    .single<Room>();

  // Development-only test fixture check (disabled in production)
  if ((roomError || !room) && process.env.NODE_ENV === "development") {
    const fixtureRoom: Room = {
      id: params.id,
      name: `Watch Room (${params.id.slice(0, 8)})`,
      description: "Development fixture",
      host_id: user.id,
      visibility: "public",
      invite_token: null,
      video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      provider: "youtube",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return (
      <RoomShell
        room={fixtureRoom}
        currentUser={currentUser}
        initialMembers={[
          {
            id: `mem_${user.id}`,
            room_id: params.id,
            user_id: user.id,
            role: "host",
            joined_at: new Date().toISOString(),
            display_name: currentUser.displayName,
            avatar_url: currentUser.avatarUrl,
            is_online: true,
          },
        ]}
        userRole="host"
      />
    );
  }

  if (roomError || !room) {
    notFound();
  }

  // 3. Verify Membership and Permissions
  const { data: membership } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", params.id)
    .eq("user_id", user.id)
    .single<RoomMember>();

  const isHost = room.host_id === user.id;
  const isPrivate = room.is_private ?? (room.visibility === "private");

  // If private room and not host or registered member, block access
  if (isPrivate && !isHost && !membership) {
    redirect(`/invite?room=${params.id}&error=access_denied`);
  }

  // If public room and not yet joined, register as viewer
  let userRole: UserRole = isHost ? "host" : (membership?.role ?? "viewer");
  if (!membership && !isHost) {
    await supabase.from("room_members").upsert(
      {
        room_id: params.id,
        user_id: user.id,
        role: "viewer",
      },
      { onConflict: "room_id,user_id", ignoreDuplicates: true }
    );
    userRole = "viewer";
  }

  // 4. Fetch Active Room Members
  const { data: members } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", params.id)
    .returns<RoomMember[]>();

  return (
    <RoomShell
      room={room}
      currentUser={currentUser}
      initialMembers={members ?? []}
      userRole={userRole}
    />
  );
}
