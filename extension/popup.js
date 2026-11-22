'use strict';

document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ type: 'SYNCWATCH_QUERY_STATUS' }, (response) => {
    if (!response) return;

    const badge = document.getElementById('status-badge');
    const roomIdEl = document.getElementById('room-id');

    if (response.isConnected && response.activeRoomId) {
      badge.textContent = 'Connected';
      badge.className = 'badge badge-connected';
      roomIdEl.textContent = response.activeRoomId.slice(0, 8) + '...';
    } else {
      badge.textContent = 'Standby';
      badge.className = 'badge badge-idle';
      roomIdEl.textContent = 'None';
    }
  });
});
