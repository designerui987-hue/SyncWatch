import { io, Socket } from "socket.io-client";

const SERVER_URL = "http://localhost:3000";
const ROOM_ID = "550e8400-e29b-41d4-a716-446655440001";

async function runMultiClientWorkflowTest() {
  console.log("--- Starting Two-Browser & MacBook-to-Tablet Workflow Test ---");

  // Client 1: MacBook Host
  const hostSocket: Socket = io(SERVER_URL, {
    auth: { token: "test-fixture-token-host-macbook" },
    transports: ["websocket"],
  });

  // Client 2: iPad / Tablet Viewer
  const viewerSocket: Socket = io(SERVER_URL, {
    auth: { token: "test-fixture-token-viewer-tablet" },
    transports: ["websocket"],
  });

  // Client 3: Unauthorized Outsider
  const outsiderSocket: Socket = io(SERVER_URL, {
    auth: { token: "test-fixture-token-nonmember-user" },
    transports: ["websocket"],
  });

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  await Promise.all([
    new Promise((resolve) => hostSocket.on("connect", () => resolve(true))),
    new Promise((resolve) => viewerSocket.on("connect", () => resolve(true))),
    new Promise((resolve) => outsiderSocket.on("connect", () => resolve(true))),
  ]);

  console.log("✓ All 3 client connections established via WebSocket");

  let hostReceivedViewerJoin = false;
  let viewerReceivedPlaybackSync = false;
  let viewerUnauthorizedBlocked = false;
  let outsiderAccessDenied = false;

  // Listeners
  hostSocket.on("member:update", (payload) => {
    if (payload.member.user_id.includes("viewer-tablet") && payload.event === "join") {
      hostReceivedViewerJoin = true;
      console.log("✓ Host received viewer join notification (MacBook-to-Tablet presence synced)");
    }
  });

  viewerSocket.on("playback:state", (payload) => {
    viewerReceivedPlaybackSync = true;
    console.log(`✓ Viewer received synchronized playback state: ${payload.state.status} at ${payload.state.current_time}s`);
  });

  viewerSocket.on("room:error", (err) => {
    if (err.code === "UNAUTHORIZED_CONTROL") {
      viewerUnauthorizedBlocked = true;
      console.log(`✓ Viewer unauthorized playback control blocked: [${err.code}] ${err.message}`);
    }
  });

  outsiderSocket.on("room:error", (err) => {
    if (err.code === "ACCESS_DENIED") {
      outsiderAccessDenied = true;
      console.log(`✓ Non-member join blocked: [${err.code}] ${err.message}`);
    }
  });

  // 1. Host joins room
  hostSocket.emit("join-room", { roomId: ROOM_ID });
  await wait(300);

  // 2. Viewer joins room
  viewerSocket.emit("join-room", { roomId: ROOM_ID });
  await wait(300);

  // 3. Outsider attempts to join private room
  outsiderSocket.emit("join-room", { roomId: ROOM_ID });
  await wait(300);

  // 4. Host changes playback (Play & Seek to 45.5s)
  hostSocket.emit("playback:update", {
    roomId: ROOM_ID,
    state: {
      status: "playing",
      current_time: 45.5,
      duration: 180,
      playback_rate: 1,
      video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      provider: "youtube",
    },
  });
  await wait(400);

  // 5. Viewer attempts to pause the room (Unauthorized action)
  viewerSocket.emit("playback:update", {
    roomId: ROOM_ID,
    state: {
      status: "paused",
      current_time: 10.0,
      provider: "youtube",
    },
  });
  await wait(400);

  // Disconnect
  hostSocket.disconnect();
  viewerSocket.disconnect();
  outsiderSocket.disconnect();

  const allPassed =
    hostReceivedViewerJoin &&
    viewerReceivedPlaybackSync &&
    viewerUnauthorizedBlocked &&
    outsiderAccessDenied;

  console.log("\n================ TEST SUMMARY ================");
  console.log(`Presence Broadcast:        ${hostReceivedViewerJoin ? "PASS" : "FAIL"}`);
  console.log(`State Synchronization:     ${viewerReceivedPlaybackSync ? "PASS" : "FAIL"}`);
  console.log(`Viewer Lockout (RBAC):     ${viewerUnauthorizedBlocked ? "PASS" : "FAIL"}`);
  console.log(`Outsider Block (Private):  ${outsiderAccessDenied ? "PASS" : "FAIL"}`);
  console.log(`Overall Workflow Status:   ${allPassed ? "ALL TESTS PASSED" : "FAILED"}`);
  console.log("==============================================\n");

  if (!allPassed) {
    process.exit(1);
  }
}

runMultiClientWorkflowTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
