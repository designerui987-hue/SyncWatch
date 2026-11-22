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
  let currentUser: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  } | null = null;

  // 1. Try Supabase Auth
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      currentUser = {
        id: user.id,
        email: user.email ?? "",
        displayName: user.user_metadata?.display_name ?? user.email ?? "Viewer",
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      };
    }
  } catch {}

  // 2. Fallback to Local Demo Cookie
  if (!currentUser) {
    const cookieStore = cookies();
    const demoCookie = cookieStore.get("syncwatch_user")?.value;
    if (demoCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(demoCookie));
        currentUser = {
          id: parsed.id || `usr_${params.id.slice(0, 4)}`,
          email: parsed.email || "demo@syncwatch.local",
          displayName: parsed.displayName || "Demo Viewer",
          avatarUrl: null,
        };
      } catch {}
    }
  }

  // If still not authenticated, redirect to /auth
  if (!currentUser) {
    redirect(`/auth?redirectTo=/room/${params.id}`);
  }

  // 3. Fetch Room from DB or Fallback to Ephemeral Room
  let room: Room | null = null;
  let members: RoomMember[] = [];
  let userRole: UserRole = "host";

  try {
    const supabase = createClient();
    const { data: dbRoom } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", params.id)
      .single<Room>();

    if (dbRoom) {
      room = dbRoom;
      const { data: dbMembers } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", params.id)
        .returns<RoomMember[]>();

      if (dbMembers) {
        members = dbMembers;
        const membership = dbMembers.find((m) => m.user_id === currentUser?.id);
        if (membership) {
          userRole = membership.role;
        }
      }
    }
  } catch {}

  // Fallback in-memory room for local dev testing
  if (!room) {
    room = {
      id: params.id,
      name: `Party Room #${params.id.slice(0, 6)}`,
      description: "Local watch party room",
      host_id: currentUser.id,
      visibility: "public",
      invite_token: `inv_${params.id}`,
      video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      provider: "youtube",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    members = [
      {
        id: `mem_${currentUser.id}`,
        room_id: params.id,
        user_id: currentUser.id,
        role: "host",
        joined_at: new Date().toISOString(),
        display_name: currentUser.displayName,
        avatar_url: currentUser.avatarUrl,
        is_online: true,
      },
    ];
    userRole = "host";
  }

  return (
    <RoomShell
      room={room}
      currentUser={currentUser}
      initialMembers={members}
      userRole={userRole}
    />
  );
}
