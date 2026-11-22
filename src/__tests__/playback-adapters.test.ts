import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateAdapterOrigin } from "../lib/playback/adapter-interface";
import { Html5VideoAdapter } from "../lib/playback/html5-adapter";
import { ExtensionBridgeAdapter, ExtensionMessagePayload } from "../lib/playback/extension-bridge-adapter";

// Lightweight Window and MessageEvent mock for Node environment
class MockWindow {
  private listeners: Record<string, Function[]> = {};

  addEventListener(type: string, fn: Function) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(fn);
  }

  removeEventListener(type: string, fn: Function) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((f) => f !== fn);
    }
  }

  dispatchEvent(event: any) {
    if (this.listeners[event.type]) {
      this.listeners[event.type].forEach((fn) => fn(event));
    }
  }

  postMessage(data: any, targetOrigin: string) {}
}

class MockMessageEvent {
  type: string;
  data: any;
  origin: string;
  constructor(type: string, init?: { data?: any; origin?: string }) {
    this.type = type;
    this.data = init?.data;
    this.origin = init?.origin || "http://localhost:3000";
  }
}

describe("Playback Adapters & Host Origin Validation Suite", () => {
  let mockWindow: MockWindow;

  beforeEach(() => {
    mockWindow = new MockWindow();
    (globalThis as any).window = mockWindow;
    (globalThis as any).MessageEvent = MockMessageEvent;
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).MessageEvent;
  });
  describe("validateAdapterOrigin Security Boundaries", () => {
    it("allows valid domains against exact domain and subdomains", () => {
      const allowed = ["youtube.com", "youtu.be"];
      expect(validateAdapterOrigin("https://youtube.com/watch?v=123", allowed)).toBe(true);
      expect(validateAdapterOrigin("https://www.youtube.com/embed/123", allowed)).toBe(true);
      expect(validateAdapterOrigin("https://youtu.be/123", allowed)).toBe(true);
    });

    it("rejects unauthorized or attacker domains", () => {
      const allowed = ["youtube.com"];
      expect(validateAdapterOrigin("https://evil-youtube.com/video", allowed)).toBe(false);
      expect(validateAdapterOrigin("https://attacker.org/?yt=youtube.com", allowed)).toBe(false);
      expect(validateAdapterOrigin("http://fakeyoutube.com", allowed)).toBe(false);
    });

    it("rejects non-HTTP protocols and injection payloads", () => {
      const allowed = ["*"];
      expect(validateAdapterOrigin("javascript:alert(1)", allowed)).toBe(false);
      expect(validateAdapterOrigin("data:text/html,boom", allowed)).toBe(false);
      expect(validateAdapterOrigin("file:///etc/passwd", allowed)).toBe(false);
      expect(validateAdapterOrigin("", allowed)).toBe(false);
    });

    it("allows verified HTTPS streams when wildcard is explicitly granted", () => {
      const allowed = ["*"];
      expect(validateAdapterOrigin("https://commondatastorage.googleapis.com/sample.mp4", allowed)).toBe(true);
      expect(validateAdapterOrigin("https://cdn.example.org/stream.m3u8", allowed)).toBe(true);
    });
  });

  describe("ExtensionBridgeAdapter Scoped Handshake & Message Routing", () => {
    const roomId = "room-test-1234";
    const sessionToken = "session-tok-abcxyz";

    it("initializes and dispatches handshake event", async () => {
      const postMessageSpy = vi.spyOn(mockWindow, "postMessage");
      const adapter = new ExtensionBridgeAdapter(roomId, sessionToken);

      await adapter.init("container");
      expect(adapter.getState().status).toBe("ready");

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SYNCWATCH_HANDSHAKE",
          roomId,
          sessionToken,
        }),
        "*"
      );

      adapter.destroy();
      expect(adapter.getState().status).toBe("uninitialized");
    });

    it("processes valid heartbeats matching room and token scope", async () => {
      const adapter = new ExtensionBridgeAdapter(roomId, sessionToken);
      await adapter.init("container");

      let latestState = adapter.getState();
      adapter.subscribe((st) => {
        latestState = st;
      });

      // Simulate incoming heartbeat from extension
      const validEvent = new MockMessageEvent("message", {
        data: {
          type: "SYNCWATCH_HEARTBEAT",
          roomId,
          sessionToken,
          status: "playing",
          currentTime: 45.5,
          duration: 120,
        } satisfies ExtensionMessagePayload,
      });

      mockWindow.dispatchEvent(validEvent);

      expect(latestState.status).toBe("playing");
      expect(latestState.currentTime).toBe(45.5);
      expect(latestState.duration).toBe(120);

      adapter.destroy();
    });

    it("discards out-of-scope messages with mismatched roomId or sessionToken", async () => {
      const adapter = new ExtensionBridgeAdapter(roomId, sessionToken);
      await adapter.init("container");

      const stateBefore = { ...adapter.getState() };

      // Dispatch forged message with attacker session
      const invalidEvent = new MockMessageEvent("message", {
        data: {
          type: "SYNCWATCH_HEARTBEAT",
          roomId: "other-room",
          sessionToken: "forged-token",
          status: "playing",
          currentTime: 999,
        } satisfies ExtensionMessagePayload,
      });

      mockWindow.dispatchEvent(invalidEvent);

      expect(adapter.getState().currentTime).toBe(stateBefore.currentTime);
      expect(adapter.getState().status).toBe(stateBefore.status);

      adapter.destroy();
    });

    it("dispatches scoped control commands on play, pause, seek", async () => {
      const postMessageSpy = vi.spyOn(mockWindow, "postMessage");
      const adapter = new ExtensionBridgeAdapter(roomId, sessionToken);
      await adapter.init("container");

      await adapter.play();
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SYNCWATCH_COMMAND",
          action: "play",
          roomId,
          sessionToken,
        }),
        "*"
      );

      await adapter.pause();
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SYNCWATCH_COMMAND",
          action: "pause",
          roomId,
          sessionToken,
        }),
        "*"
      );

      await adapter.seek(75);
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SYNCWATCH_COMMAND",
          action: "seek",
          currentTime: 75,
          roomId,
          sessionToken,
        }),
        "*"
      );

      adapter.destroy();
    });
  });
});
