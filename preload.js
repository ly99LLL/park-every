// 心流花园 - Electron Preload 脚本
// 安全地在渲染进程和主进程之间桥接

const { contextBridge } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
});
