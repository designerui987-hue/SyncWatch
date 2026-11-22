import { describe, it, expect } from "vitest";
import {
  joinRoomSchema,
  leaveRoomSchema,
  playbackUpdateSchema,
  chatSendSchema,
  checkRoomMembershipAndRole,
} from "../../server/index";
import { verifyUserToken } from "../../server/auth";

describe("Security & Authorization Regression Suite", () => {
  // ─── 1. Zod Payload Validation ──────────────────────────────────────────────
  describe("Zod Event Payload Schemas", () => {
    it("accepts valid join-room payload", () => {
      const valid = joinRoomSchema.safeParse({
        roomId: "550e8400-e29b-41d4-a716-446655440000",
        token: "sample-token",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects empty roomId in join-room", () => {
      const invalid = joinRoomSchema.safeParse({ roomId: "" });
      expect(invalid.success).toBe(false);
    });

    it("validates playback:update payload correctly", () => {
      const valid = playbackUpdateSchema.safeParse({
        roomId: "room-123",
        state: {
          status: "playing",
          current_time: 42.5,
          duration: 120,
          playback_rate: 1,
          video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          provider: "youtube",
        },
      });
      expect(valid.success).toBe(true);
    });

    it("rejects negative current_time in playback update", () => {
      const invalid = playbackUpdateSchema.safeParse({
        roomId: "room-123",
        state: {
          status: "playing",
          current_time: -5,
          provider: "youtube",
        },
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects invalid playback status values", () => {
      const invalid = playbackUpdateSchema.safeParse({
        roomId: "room-123",
        state: {
          status: "invalid-status",
          current_time: 10,
          provider: "youtube",
        },
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects empty chat content", () => {
      const invalid = chatSendSchema.safeParse({
        roomId: "room-123",
        content: "   ",
        tempId: "tmp-1",
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects chat content exceeding 1000 characters", () => {
      const longText = "a".repeat(1001);
      const invalid = chatSendSchema.safeParse({
        roomId: "room-123",
        content: longText,
        tempId: "tmp-1",
      });
      expect(invalid.success).toBe(false);
    });
  });

  // ─── 2. Membership & Role Authorization ─────────────────────────────────────
  describe("Role-Based Access Control", () => {
    it("authorizes host with full control role", async () => {
      const result = await checkRoomMembershipAndRole("room-123", "host-user-1");
      expect(result.isMember).toBe(true);
      expect(result.role).toBe("host");
    });

    it("authorizes co-host with control permissions", async () => {
      const result = await checkRoomMembershipAndRole("room-123", "cohost-user-2");
      expect(result.isMember).toBe(true);
      expect(result.role).toBe("co-host");
    });

    it("authorizes viewer as read-only member", async () => {
      const result = await checkRoomMembershipAndRole("room-123", "viewer-user-3");
      expect(result.isMember).toBe(true);
      expect(result.role).toBe("viewer");
    });

    it("rejects non-members from joining private rooms", async () => {
      const result = await checkRoomMembershipAndRole("room-123", "nonmember-user-4");
      expect(result.isMember).toBe(false);
      expect(result.role).toBe(null);
    });
  });

  // ─── 3. Token Authentication Security ───────────────────────────────────────
  describe("Authentication Token Security", () => {
    it("rejects empty, null, or whitespace tokens", async () => {
      expect(await verifyUserToken("")).toBe(null);
      expect(await verifyUserToken("   ")).toBe(null);
      expect(await verifyUserToken(null as any)).toBe(null);
      expect(await verifyUserToken(undefined as any)).toBe(null);
    });

    it("rejects arbitrary forged tokens without Supabase signature", async () => {
      const forgedToken = "forged-token-header.payload.signature";
      const user = await verifyUserToken(forgedToken);
      expect(user).toBe(null);
    });
  });
});
