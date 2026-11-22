export type UserRole = "host" | "co-host" | "viewer";
export type VideoProvider = "youtube" | "html5";
export type RoomVisibility = "public" | "private";
export type PlaybackStatus = "playing" | "paused" | "buffering" | "ended";

// ─── Core domain models ───────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  description: string | null;
  host_id: string;
  is_private?: boolean;
  visibility: RoomVisibility;
  invite_token: string | null;
  video_url: string | null;
  video_type?: string;
  provider: VideoProvider;
  max_members?: number;
  created_at: string;
  updated_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
  display_name?: string;
  avatar_url?: string | null;
  is_online?: boolean;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  content: string;
  created_at: string;
  /** Optimistic messages not yet confirmed by server */
  pending?: boolean;
}

export interface PlaybackState {
  status: PlaybackStatus;
  current_time: number;
  duration: number;
  playback_rate: number;
  video_url: string | null;
  provider: VideoProvider;
  updated_at: number; // Date.now() on server
  updated_by: string; // user_id
}

// ─── Socket.IO event payloads ─────────────────────────────────────────────────

export interface JoinRoomPayload {
  roomId: string;
  token: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface PlaybackEventPayload {
  roomId: string;
  state: Omit<PlaybackState, "updated_at" | "updated_by">;
}

export interface ChatMessagePayload {
  roomId: string;
  content: string;
  tempId: string;
}

export interface MemberUpdatePayload {
  roomId: string;
  member: RoomMember;
  event: "join" | "leave" | "role-change";
}

export interface ServerPlaybackPayload {
  state: PlaybackState;
  corrected: boolean;
}

export interface ChatMessageAckPayload {
  tempId: string;
  message: Message;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// ─── Socket event name maps ───────────────────────────────────────────────────

export interface ServerToClientEvents {
  "playback:state": (payload: ServerPlaybackPayload) => void;
  "chat:message": (payload: Message) => void;
  "chat:message:ack": (payload: ChatMessageAckPayload) => void;
  "member:update": (payload: MemberUpdatePayload) => void;
  "room:error": (payload: ErrorPayload) => void;
  "room:joined": (payload: { room: Room; members: RoomMember[]; playback: PlaybackState }) => void;
}

export interface ClientToServerEvents {
  "join-room": (payload: JoinRoomPayload) => void;
  "leave-room": (payload: LeaveRoomPayload) => void;
  "playback:update": (payload: PlaybackEventPayload) => void;
  "chat:send": (payload: ChatMessagePayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  roomRoles?: Record<string, UserRole>;
}

// ─── API request / response shapes ───────────────────────────────────────────

export interface CreateRoomRequest {
  name: string;
  description?: string;
  visibility?: RoomVisibility;
  videoUrl?: string;
  provider?: VideoProvider;
}

export interface CreateRoomResponse {
  room: Room;
}

export interface UpdateRoomRequest {
  name?: string;
  description?: string;
  visibility?: RoomVisibility;
  videoUrl?: string;
  provider?: VideoProvider;
}

export interface InviteTokenResponse {
  token: string;
  invite_url: string;
  expires_at: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}


declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}
