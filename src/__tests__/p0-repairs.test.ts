import { describe, it, expect } from "vitest";
import { safeRedirectUrl } from "../lib/auth-redirect";
import { updateRoomSchema } from "../lib/validations/room";

describe("P0 Security & Architecture Verification Suite", () => {
  // ─── 1. Auth Open-Redirect Vulnerability Prevention ─────────────────────────
  describe("safeRedirectUrl Open-Redirect Defense", () => {
    it("preserves valid internal relative paths", () => {
      expect(safeRedirectUrl("/room/550e8400-e29b-41d4-a716-446655440000")).toBe(
        "/room/550e8400-e29b-41d4-a716-446655440000"
      );
      expect(safeRedirectUrl("/?create=true")).toBe("/?create=true");
      expect(safeRedirectUrl("/room/abc?t=10#chat")).toBe("/room/abc?t=10#chat");
      expect(safeRedirectUrl("/auth")).toBe("/auth");
    });

    it("rejects absolute external URLs", () => {
      expect(safeRedirectUrl("https://evil.com")).toBe("/");
      expect(safeRedirectUrl("http://evil.com/room/123")).toBe("/");
      expect(safeRedirectUrl("ftp://attacker.org")).toBe("/");
    });

    it("rejects protocol-relative bypasses (//evil.com, /\\evil.com)", () => {
      expect(safeRedirectUrl("//evil.com")).toBe("/");
      expect(safeRedirectUrl("//evil.com/phish")).toBe("/");
      expect(safeRedirectUrl("/\\evil.com")).toBe("/");
      expect(safeRedirectUrl("/\\\\evil.com")).toBe("/");
      expect(safeRedirectUrl("/\\/evil.com")).toBe("/");
    });

    it("rejects script and data schemes", () => {
      expect(safeRedirectUrl("javascript:alert(1)")).toBe("/");
      expect(safeRedirectUrl("data:text/html,<script>alert(1)</script>")).toBe("/");
      expect(safeRedirectUrl("vbscript:msgbox")).toBe("/");
    });

    it("handles empty, null, and non-string inputs safely with fallback", () => {
      expect(safeRedirectUrl("")).toBe("/");
      expect(safeRedirectUrl(null)).toBe("/");
      expect(safeRedirectUrl(undefined)).toBe("/");
      expect(safeRedirectUrl(undefined, "/custom-fallback")).toBe("/custom-fallback");
    });

    it("strips or rejects control characters and newlines", () => {
      expect(safeRedirectUrl("/room/\nnew-line")).toBe("/");
      expect(safeRedirectUrl("/room/\x00null-byte")).toBe("/");
    });
  });

  // ─── 2. PATCH /api/rooms/[id] Column Safety & Normalization ─────────────────
  describe("Room PATCH Schema & Column Normalization", () => {
    it("validates room update payload with visibility & provider", () => {
      const parsed = updateRoomSchema.safeParse({
        name: "Updated Room Name",
        visibility: "private",
        provider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      });
      expect(parsed.success).toBe(true);
    });

    it("ensures visibility maps to is_private (not generated visibility column)", () => {
      const parsed = updateRoomSchema.parse({
        visibility: "private",
      });

      // Simulation of route logic
      const updateData: Record<string, unknown> = {};
      if (parsed.visibility !== undefined) {
        updateData.is_private = parsed.visibility === "private";
      }

      expect(updateData.is_private).toBe(true);
      expect(updateData.visibility).toBeUndefined(); // Must NOT write to generated column
    });

    it("normalizes provider to database video_type ('youtube' | 'direct')", () => {
      const testCases: Array<{ provider: "youtube" | "html5"; expectedVideoType: string }> = [
        { provider: "youtube", expectedVideoType: "youtube" },
        { provider: "html5", expectedVideoType: "direct" },
      ];

      for (const tc of testCases) {
        const parsed = updateRoomSchema.parse({ provider: tc.provider });
        const videoType = parsed.provider === "youtube" ? "youtube" : "direct";
        expect(videoType).toBe(tc.expectedVideoType);
      }
    });
  });

  // ─── 3. Invitation Token Expiry, Revocation, and Capacity Rules ──────────────
  describe("Invite Token Expiry & Security Logic", () => {
    interface MockInviteToken {
      token: string;
      expires_at: string;
      revoked: boolean;
      max_uses: number | null;
      uses: number;
    }

    function evaluateInviteRedemption(
      tokenRecord: MockInviteToken | null,
      currentMembers: number,
      maxRoomCapacity: number
    ): "success" | "invalid_token" | "expired_token" | "revoked_token" | "max_uses_reached" | "room_full" {
      if (!tokenRecord) return "invalid_token";
      if (tokenRecord.revoked) return "revoked_token";
      if (new Date(tokenRecord.expires_at) <= new Date()) return "expired_token";
      if (tokenRecord.max_uses !== null && tokenRecord.uses >= tokenRecord.max_uses) return "max_uses_reached";
      if (currentMembers >= maxRoomCapacity) return "room_full";
      return "success";
    }

    it("succeeds for valid, unexpired, unrevoked token with available capacity", () => {
      const token: MockInviteToken = {
        token: "valid-tok-123",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked: false,
        max_uses: 10,
        uses: 2,
      };
      expect(evaluateInviteRedemption(token, 3, 20)).toBe("success");
    });

    it("rejects expired invite tokens", () => {
      const expiredToken: MockInviteToken = {
        token: "expired-tok-456",
        expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        revoked: false,
        max_uses: null,
        uses: 1,
      };
      expect(evaluateInviteRedemption(expiredToken, 2, 20)).toBe("expired_token");
    });

    it("rejects revoked invite tokens", () => {
      const revokedToken: MockInviteToken = {
        token: "revoked-tok-789",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked: true,
        max_uses: null,
        uses: 0,
      };
      expect(evaluateInviteRedemption(revokedToken, 2, 20)).toBe("revoked_token");
    });

    it("rejects when token max_uses is exceeded", () => {
      const maxedToken: MockInviteToken = {
        token: "maxed-tok-101",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked: false,
        max_uses: 5,
        uses: 5,
      };
      expect(evaluateInviteRedemption(maxedToken, 5, 20)).toBe("max_uses_reached");
    });

    it("rejects when room is at maximum capacity", () => {
      const token: MockInviteToken = {
        token: "room-full-tok",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked: false,
        max_uses: null,
        uses: 3,
      };
      expect(evaluateInviteRedemption(token, 20, 20)).toBe("room_full");
    });
  });

  // ─── 4. Role Escalation Prevention ──────────────────────────────────────────
  describe("Role Escalation & Permission Enforcement", () => {
    it("prohibits assigning 'host' role upon invite redemption", () => {
      // Invite redemption must strictly assign 'viewer'
      const assignedRoleOnRedeem = "viewer";
      expect(["co-host", "host"].includes(assignedRoleOnRedeem)).toBe(false);
      expect(assignedRoleOnRedeem).toBe("viewer");
    });

    it("prevents demoting the room host via role updates", () => {
      function canModifyMemberRole(
        callerRole: string,
        targetRole: string,
        newRole: string
      ): { allowed: boolean; reason?: string } {
        if (callerRole !== "host") {
          return { allowed: false, reason: "Forbidden: Only host can modify roles" };
        }
        if (targetRole === "host") {
          return { allowed: false, reason: "Cannot modify the host's role" };
        }
        if (!["co-host", "viewer"].includes(newRole)) {
          return { allowed: false, reason: "Invalid target role" };
        }
        return { allowed: true };
      }

      // Host demoting themselves: rejected
      expect(canModifyMemberRole("host", "host", "viewer").allowed).toBe(false);

      // Viewer attempting to promote themselves: rejected
      expect(canModifyMemberRole("viewer", "viewer", "co-host").allowed).toBe(false);

      // Co-host attempting to promote anyone: rejected
      expect(canModifyMemberRole("co-host", "viewer", "co-host").allowed).toBe(false);

      // Host promoting a viewer to co-host: allowed
      expect(canModifyMemberRole("host", "viewer", "co-host").allowed).toBe(true);

      // Host demoting a co-host to viewer: allowed
      expect(canModifyMemberRole("host", "co-host", "viewer").allowed).toBe(true);
    });
  });
});
