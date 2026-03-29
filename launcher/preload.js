// openclaw-kr preload script
// contextIsolation 환경에서 안전하게 API를 노출한다.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openclawKR', {
  version: '0.1.0-alpha',
  // gateway 상태 확인 (main process에서 health check 수행)
  getStatus: () => ipcRenderer.invoke('openclaw:status'),
  // 실행 영수증 + 비용 가시성 (Phase 1-B)
  receipts: {
    getHistory: () => ipcRenderer.invoke('openclaw:receipts:history'),
    getSessionCost: () => ipcRenderer.invoke('openclaw:receipts:session-cost'),
    getCurrentState: () =>
      ipcRenderer.invoke('openclaw:receipts:current-state'),
    onUpdate: (/** @type {Function} */ callback) => {
      const handler = (/** @type {any} */ _event, /** @type {any} */ data) => callback(data);
      ipcRenderer.on('openclaw:receipts:update', handler);
      return () =>
        ipcRenderer.removeListener('openclaw:receipts:update', handler);
    },
  },
  // Team 모드 (Phase 1-E: Cheap Team Mini)
  team: {
    getStatus: () => ipcRenderer.invoke('openclaw:team:status'),
    toggle: (/** @type {boolean} */ enabled) =>
      ipcRenderer.invoke('openclaw:team:toggle', enabled),
    getConfig: () => ipcRenderer.invoke('openclaw:team:config'),
    getHandoffs: (/** @type {number} */ limit) =>
      ipcRenderer.invoke('openclaw:team:handoffs', limit),
    getHandoffDetail: (/** @type {string} */ id) =>
      ipcRenderer.invoke('openclaw:team:handoff-detail', id),
  },
  // 채널 바인딩 (Phase 1: 세션 바인딩)
  channel: {
    bind: (/** @type {string} */ platform, /** @type {string} */ userId, /** @type {string} */ sessionId, /** @type {string} */ threadId) =>
      ipcRenderer.invoke('openclaw:channel:bind', platform, userId, sessionId, threadId),
    lookup: (/** @type {string} */ platform, /** @type {string} */ userId) =>
      ipcRenderer.invoke('openclaw:channel:lookup', platform, userId),
    list: () => ipcRenderer.invoke('openclaw:channel:list'),
    unbind: (/** @type {string} */ platform, /** @type {string} */ userId) =>
      ipcRenderer.invoke('openclaw:channel:unbind', platform, userId),
  },
});
