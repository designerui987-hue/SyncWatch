// SyncWatch Companion Service Worker (Manifest V3)
'use strict';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[SyncWatch Extension] Installed successfully.');
  chrome.storage.local.set({ activeRoomId: null, isConnected: false });
});

// Relay messages between SyncWatch rooms and target player tabs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNCWATCH_REGISTER_ROOM') {
    chrome.storage.local.set({
      activeRoomId: message.roomId,
      sessionToken: message.sessionToken,
      isConnected: true,
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'SYNCWATCH_QUERY_STATUS') {
    chrome.storage.local.get(['activeRoomId', 'isConnected'], (data) => {
      sendResponse(data);
    });
    return true;
  }
});
