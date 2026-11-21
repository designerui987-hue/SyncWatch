export interface RoomState {
  roomId: string;
  positionMs: number;
  isPlaying: boolean;
  videoUrl: string | null;
  provider: "youtube" | "html5";
  lastUpdatedAt: number;
  lastUpdatedBy: string;
}

export class RoomStore {
  private rooms = new Map<string, RoomState>();

  get(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  set(roomId: string, patch: Partial<RoomState> & { roomId: string }): RoomState {
    const existing = this.rooms.get(roomId);
    const now = Date.now();

    if (!existing) {
      const initial: RoomState = {
        roomId,
        positionMs: patch.positionMs ?? 0,
        isPlaying: patch.isPlaying ?? false,
        videoUrl: patch.videoUrl ?? null,
        provider: patch.provider ?? "youtube",
        lastUpdatedAt: now,
        lastUpdatedBy: patch.lastUpdatedBy ?? "system",
      };
      this.rooms.set(roomId, initial);
      return initial;
    }

    const updated: RoomState = {
      ...existing,
      ...patch,
      lastUpdatedAt: now,
    };
    this.rooms.set(roomId, updated);
    return updated;
  }

  delete(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  currentPosition(roomId: string): number {
    const state = this.rooms.get(roomId);
    if (!state) return 0;
    if (!state.isPlaying) return state.positionMs;

    const elapsed = Date.now() - state.lastUpdatedAt;
    return Math.max(0, state.positionMs + elapsed);
  }
}

export const roomStore = new RoomStore();
