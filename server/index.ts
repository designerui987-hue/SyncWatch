import http from "node:http";
import express from "express";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { roomStore } from "./rooms";
import { evaluatePlaybackSync } from "./playback";
import { RateLimiter } from "./rateLimit";
import { verifyUserToken } from "./auth";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  RoomMember,
  Message,
} from "../src/types";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

const chatRateLimiter = new RateLimiter({ windowMs: 1000, maxRequests: 3 });
const playbackRateLimiter = new RateLimiter({ windowMs: 1000, maxRequests: 5 });

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

  // Socket authentication middleware
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
    };

    nextMiddleware();
  });

  io.on("connection", (socket) => {
    const { userId, displayName, avatarUrl } = socket.data;

    socket.on("join-room", async ({ roomId }) => {
      socket.join(roomId);

      const authoritativeState = roomStore.get(roomId);
      const currentPos = roomStore.currentPosition(roomId);

      const member: RoomMember = {
        id: socket.id,
        room_id: roomId,
        user_id: userId,
        role: "viewer",
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

    socket.on("leave-room", ({ roomId }) => {
      socket.leave(roomId);
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

    socket.on("playback:update", ({ roomId, state }) => {
      if (!playbackRateLimiter.isAllowed(socket.id)) {
        socket.emit("room:error", {
          code: "RATE_LIMITED",
          message: "Too many playback controls sent in a short window.",
        });
        return;
      }

      const isPlaying = state.status === "playing";
      const targetPosMs = Math.round(state.current_time * 1000);
      const serverCurrentPosMs = roomStore.currentPosition(roomId);

      const assessment = evaluatePlaybackSync(serverCurrentPosMs, targetPosMs);

      const updated = roomStore.set(roomId, {
        roomId,
        positionMs: targetPosMs,
        isPlaying,
        videoUrl: state.video_url,
        provider: state.provider,
        lastUpdatedBy: userId,
      });

      io.to(roomId).emit("playback:state", {
        state: {
          ...state,
          updated_at: updated.lastUpdatedAt,
          updated_by: userId,
        },
        corrected: assessment.requiresCorrection,
      });
    });

    socket.on("chat:send", ({ roomId, content, tempId }) => {
      if (!chatRateLimiter.isAllowed(socket.id)) {
        socket.emit("room:error", {
          code: "RATE_LIMITED",
          message: "Please slow down your chat messages.",
        });
        return;
      }

      const trimmed = content.trim();
      if (!trimmed || trimmed.length > 1000) {
        return;
      }

      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        room_id: roomId,
        user_id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
        content: trimmed,
        created_at: new Date().toISOString(),
      };

      socket.emit("chat:message:ack", { tempId, message });
      io.to(roomId).emit("chat:message", message);
    });

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit("member:update", {
            roomId: room,
            member: {
              id: socket.id,
              room_id: room,
              user_id: userId,
              role: "viewer",
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
