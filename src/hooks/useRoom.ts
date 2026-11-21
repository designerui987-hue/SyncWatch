import { useState, useCallback } from "react";
import type { Room, RoomMember, UserRole } from "@/types";

interface UseRoomProps {
  initialRoom: Room;
  initialMembers: RoomMember[];
  initialRole: UserRole;
}

export function useRoom({ initialRoom, initialMembers, initialRole }: UseRoomProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [members, setMembers] = useState<RoomMember[]>(initialMembers);
  const [myRole, setMyRole] = useState<UserRole>(initialRole);

  const canControl = myRole === "host" || myRole === "co-host";
  const isHost = myRole === "host";

  const updateMember = useCallback((member: RoomMember, event: "join" | "leave" | "role-change") => {
    setMembers((prev) => {
      if (event === "leave") {
        return prev.filter((m) => m.user_id !== member.user_id);
      }
      const existingIdx = prev.findIndex((m) => m.user_id === member.user_id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], ...member };
        return copy;
      }
      return [...prev, member];
    });
  }, []);

  return {
    room,
    setRoom,
    members,
    setMembers,
    myRole,
    setMyRole,
    canControl,
    isHost,
    updateMember,
  };
}
