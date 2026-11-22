// SyncWatch Content Script
// Handles bidirectional communication between SyncWatch Web App and HTML5 Player
'use strict';

(function () {
  let activeVideoElement = null;
  let currentRoomId = null;
  let currentToken = null;

  function findVideoPlayer() {
    return document.querySelector('video');
  }

  // Listen for commands dispatched from SyncWatch Web App
  window.addEventListener('message', (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;

    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'SYNCWATCH_HANDSHAKE') {
      currentRoomId = msg.roomId;
      currentToken = msg.sessionToken;
      activeVideoElement = findVideoPlayer();

      if (activeVideoElement) {
        attachVideoListeners(activeVideoElement);
      }

      window.postMessage({
        type: 'SYNCWATCH_HEARTBEAT',
        roomId: currentRoomId,
        sessionToken: currentToken,
        status: activeVideoElement ? (activeVideoElement.paused ? 'paused' : 'playing') : 'ready',
        currentTime: activeVideoElement ? activeVideoElement.currentTime : 0,
        duration: activeVideoElement ? activeVideoElement.duration : 0,
      }, '*');
      return;
    }

    if (msg.type === 'SYNCWATCH_COMMAND' && msg.roomId === currentRoomId && msg.sessionToken === currentToken) {
      if (!activeVideoElement) activeVideoElement = findVideoPlayer();
      if (!activeVideoElement) return;

      if (msg.action === 'play') {
        activeVideoElement.play().catch((e) => console.warn('[SyncWatch Extension] Play blocked:', e));
      } else if (msg.action === 'pause') {
        activeVideoElement.pause();
      } else if (msg.action === 'seek' && typeof msg.currentTime === 'number') {
        activeVideoElement.currentTime = msg.currentTime;
      } else if (msg.action === 'rate' && typeof msg.playbackRate === 'number') {
        activeVideoElement.playbackRate = msg.playbackRate;
      }
    }
  });

  function attachVideoListeners(video) {
    if (video.dataset.syncwatchAttached === 'true') return;
    video.dataset.syncwatchAttached = 'true';

    const sendHeartbeat = (status) => {
      if (!currentRoomId || !currentToken) return;
      window.postMessage({
        type: 'SYNCWATCH_HEARTBEAT',
        roomId: currentRoomId,
        sessionToken: currentToken,
        status,
        currentTime: video.currentTime,
        duration: video.duration || 0,
        playbackRate: video.playbackRate,
      }, '*');
    };

    video.addEventListener('play', () => sendHeartbeat('playing'));
    video.addEventListener('pause', () => sendHeartbeat('paused'));
    video.addEventListener('waiting', () => sendHeartbeat('buffering'));
    video.addEventListener('ended', () => sendHeartbeat('ended'));
  }
})();
