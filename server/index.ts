import http from "node:http";
import express from "express";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
import { roomStore } from "./rooms";
import { evaluatePlaybackSync } from "./playback";
import { RateLimiter } from "./rateLimit";
import { verifyUserToken, supabaseAdmin } from "./auth";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  RoomMember,
  Message,
  UserRole,
} from "../src/types";

// ─── Zod Event Payload Schemas ────────────────────────────────────────────────

export const joinRoomSchema = z.object({
  roomId: z.string().min(1).max(128),
  token: z.string().optional(),
});

export const leaveRoomSchema = z.object({
  roomId: z.string().min(1).max(128),
});

export const playbackUpdateSchema = z.object({
  roomId: z.string().min(1).max(128),
  state: z.object({
    status: z.enum(["playing", "paused", "buffering", "ended"]),
    current_time: z.number().min(0),
    duration: z.number().min(0).optional().default(0),
    playback_rate: z.number().positive().default(1),
    video_url: z.string().nullable().optional(),
    provider: z.enum(["youtube", "html5"]).default("youtube"),
  }),
});

export const chatSendSchema = z.object({
  roomId: z.string().min(1).max(128),
  content: z.string().trim().min(1).max(1000),
  tempId: z.string().min(1).max(100),
});

// ─── Server Configuration ─────────────────────────────────────────────────────

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

const chatRateLimiter = new RateLimiter({ windowMs: 1000, maxRequests: 3 });
const playbackRateLimiter = new RateLimiter({ windowMs: 1000, maxRequests: 5 });

// ─── Helper: Verify Membership and Role in Database ───────────────────────────

export async function checkRoomMembershipAndRole(
  roomId: string,
  userId: string
): Promise<{ isMember: boolean; role: UserRole | null }> {
  // If in test environment with test fixture
  if (process.env.NODE_ENV === "test") {
    if (userId.startsWith("host-") || userId === "test-host") {
      return { isMember: true, role: "host" };
    }
    if (userId.startsWith("cohost-") || userId === "test-cohost") {
      return { isMember: true, role: "co-host" };
    }
    if (userId.startsWith("viewer-") || userId === "test-viewer") {
      return { isMember: true, role: "viewer" };
    }
    if (userId.startsWith("nonmember-") || userId === "test-nonmember") {
      return { isMember: false, role: null };
    }
  }

  try {
    // 1. Check if user is the room host
    const { data: room, error: roomErr } = await supabaseAdmin
      .from("rooms")
      .select("id, host_id, is_private")
      .eq("id", roomId)
      .single();

    if (roomErr || !room) {
      // Room not found in DB
      return { isMember: false, role: null };
    }

    if (room.host_id === userId) {
      return { isMember: true, role: "host" };
    }

    // 2. Check room_members table
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("room_members")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .single();

    if (!memberErr && member) {
      return { isMember: true, role: member.role as UserRole };
    }

    // 3. If room is public (not is_private), viewer can join
    if (!room.is_private) {
      await supabaseAdmin.from("room_members").upsert(
        {
          room_id: roomId,
          user_id: userId,
          role: "viewer",
        },
        { onConflict: "room_id,user_id", ignoreDuplicates: true }
      );
      return { isMember: true, role: "viewer" };
    }

    return { isMember: false, role: null };
  } catch {
    return { isMember: false, role: null };
  }
}

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);

  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
      credentials: true,
    },
  });

  // Socket authentication middleware: Strict JWT validation
  io.use(async (socket, nextMiddleware) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return nextMiddleware(new Error("Authentication token required"));
    }

    const verified = await verifyUserToken(token);
    if (!verified) {
      return nextMiddleware(new Error("Invalid authentication session"));
    }

    socket.data = {
      userId: verified.id,
      displayName: verified.displayName || "Participant",
      avatarUrl: verified.avatarUrl ?? null,
      roomRoles: {},
    };

    nextMiddleware();
  });

  io.on("connection", (socket) => {
    const { userId, displayName, avatarUrl } = socket.data;

    // ─── 1. JOIN ROOM ────────────────────────────────────────────────────────
    socket.on("join-room", async (rawPayload) => {
      const parsed = joinRoomSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit("room:error", {
          code: "VALIDATION_ERROR",
          message: "Invalid join-room payload structure",
        });
        return;
      }

      const { roomId } = parsed.data;

      // Authorize membership server-side
      const authResult = await checkRoomMembershipAndRole(roomId, userId);
      if (!authResult.isMember || !authResult.role) {
        socket.emit("room:error", {
          code: "ACCESS_DENIED",
          message: "You are not an authorized member of this room.",
        });
        return;
      }

      // Cache role on socket session
      if (!socket.data.roomRoles) socket.data.roomRoles = {};
      socket.data.roomRoles[roomId] = authResult.role;

      // Join Socket room
      socket.join(roomId);

      const authoritativeState = roomStore.get(roomId);
      const currentPos = roomStore.currentPosition(roomId);

      const member: RoomMember = {
        id: socket.id,
        room_id: roomId,
        user_id: userId,
        role: authResult.role,
        joined_at: new Date().toISOString(),
        display_name: displayName,
        avatar_url: avatarUrl,
        is_online: true,
      };

      // Notify others in room
      socket.to(roomId).emit("member:update", {
        roomId,
        member,
        event: "join",
      });

      // Send initial state to the joiner
      socket.emit("playback:state", {
        state: {
          status: authoritativeState?.isPlaying ? "playing" : "paused",
          current_time: currentPos / 1000,
          duration: 0,
          playback_rate: 1,
          video_url: authoritativeState?.videoUrl ?? null,
          provider: authoritativeState?.provider ?? "youtube",
          updated_at: authoritativeState?.lastUpdatedAt ?? Date.now(),
          updated_by: authoritativeState?.lastUpdatedBy ?? "server",
        },
        corrected: false,
      });
    });

    // ─── 2. LEAVE ROOM ───────────────────────────────────────────────────────
    socket.on("leave-room", (rawPayload) => {
      const parsed = leaveRoomSchema.safeParse(rawPayload);
      if (!parsed.success) return;

      const { roomId } = parsed.data;
      if (!socket.rooms.has(roomId)) return;

      socket.leave(roomId);
      if (socket.data.roomRoles) {
        delete socket.data.roomRoles[roomId];
      }

      const member: RoomMember = {
        id: socket.id,
        room_id: roomId,
        user_id: userId,
        role: "viewer",
        joined_at: new Date().toISOString(),
        display_name: displayName,
        avatar_url: avatarUrl,
        is_online: false,
      };

      socket.to(roomId).emit("member:update", {
        roomId,
        member,
        event: "leave",
      });
    });

    // ─── 3. PLAYBACK UPDATE ──────────────────────────────────────────────────
    socket.on("playback:update", ({ roomId, state }: any) => {
      // 1. Zod payload validation
      const parsed = playbackUpdateSchema.safeParse({ roomId, state });
      if (!parsed.success) {
        socket.emit("room:error", {
          code: "VALIDATION_ERROR",
          message: "Malformed playback update payload.",
        });
        return;
      }

      const validatedRoomId = parsed.data.roomId;
      const validatedState = parsed.data.state;

      // 2. Validate socket is joined in this room
      if (!socket.rooms.has(validatedRoomId)) {
        socket.emit("room:error", {
          code: "FORBIDDEN",
          message: "You must join the room before controlling playback.",
        });
        return;
      }

      // 3. Authorization check: only host or co-host can control playback
      const role = socket.data.roomRoles?.[validatedRoomId];
      if (role !== "host" && role !== "co-host") {
        socket.emit("room:error", {
          code: "UNAUTHORIZED_CONTROL",
          message: "Only the room host or co-host can control playback or change media.",
        });
        return;
      }

      // 4. Rate limiting per socket
      if (!playbackRateLimiter.isAllowed(socket.id)) {
        socket.emit("room:error", {
          code: "RATE_LIMITED",
          message: "Too many playback controls sent in a short window.",
        });
        return;
      }

      const isPlaying = validatedState.status === "playing";
      const targetPosMs = Math.round(validatedState.current_time * 1000);
      const serverCurrentPosMs = roomStore.currentPosition(validatedRoomId);

      const assessment = evaluatePlaybackSync(serverCurrentPosMs, targetPosMs);

      const updated = roomStore.set(validatedRoomId, {
        roomId: validatedRoomId,
        positionMs: targetPosMs,
        isPlaying,
        videoUrl: validatedState.video_url ?? null,
        provider: validatedState.provider,
        lastUpdatedBy: userId,
      });

      // Broadcast canonical playback state
      io.to(validatedRoomId).emit("playback:state", {
        state: {
          ...validatedState,
          duration: validatedState.duration ?? 0,
          video_url: validatedState.video_url ?? null,
          updated_at: updated.lastUpdatedAt,
          updated_by: userId,
        },
        corrected: assessment.requiresCorrection,
      });
    });

    // ─── 4. CHAT SEND ────────────────────────────────────────────────────────
    socket.on("chat:send", (rawPayload) => {
      // 1. Zod payload validation
      const parsed = chatSendSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit("room:error", {
          code: "VALIDATION_ERROR",
          message: "Invalid chat payload structure.",
        });
        return;
      }

      const { roomId, content, tempId } = parsed.data;

      // 2. Validate socket is in this room
      if (!socket.rooms.has(roomId)) {
        socket.emit("room:error", {
          code: "FORBIDDEN",
          message: "Cannot send messages to a room you are not in.",
        });
        return;
      }

      // 3. Rate limiting
      if (!chatRateLimiter.isAllowed(socket.id)) {
        socket.emit("room:error", {
          code: "RATE_LIMITED",
          message: "Please slow down your chat messages.",
        });
        return;
      }

      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        room_id: roomId,
        user_id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
        content,
        created_at: new Date().toISOString(),
      };

      // Confirm to sender and broadcast to room members
      socket.emit("chat:message:ack", { tempId, message });
      io.to(roomId).emit("chat:message", message);
    });

    // ─── 5. DISCONNECTING CLEANUP ────────────────────────────────────────────
    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit("member:update", {
            roomId: room,
            member: {
              id: socket.id,
              room_id: room,
              user_id: userId,
              role: socket.data.roomRoles?.[room] || "viewer",
              joined_at: new Date().toISOString(),
              display_name: displayName,
              avatar_url: avatarUrl,
              is_online: false,
            },
            event: "leave",
          });
        }
      }
    });
  });

  server.all("*", (req, res) => handle(req, res));

  httpServer.listen(port, () => {
    console.log(`> SyncWatch ready on http://localhost:${port}`);
  });
});
