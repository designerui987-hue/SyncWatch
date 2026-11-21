import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoomShell } from "@/components/room/RoomShell";
import type { Room, RoomMember } from "@/types";

interface RoomPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: RoomPageProps) {
  const supabase = createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("name")
    .eq("id", params.id)
    .single();

  return {
    title: room ? room.name : "Watch Room",
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?redirectTo=/room/${params.id}`);
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", params.id)
    .single<Room>();

  if (roomError || !room) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", params.id)
    .eq("user_id", user.id)
    .single<RoomMember>();

  if (room.visibility === "private" && !membership) {
    redirect(`/invite?room=${params.id}&error=access_denied`);
  }

  const { data: members } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", params.id)
    .returns<RoomMember[]>();

  return (
    <RoomShell
      room={room}
      currentUser={{
        id: user.id,
        email: user.email ?? "",
        displayName: user.user_metadata?.display_name ?? user.email ?? "Viewer",
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      }}
      initialMembers={members ?? []}
      userRole={membership?.role ?? "viewer"}
    />
  );
}
