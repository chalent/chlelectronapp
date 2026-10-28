/// <reference types="vite/client" />

/**
 * NexusPoll - 渲染进程全局类型声明
 *
 * 声明 preload 暴露到 window 上的 API 类型，
 * 使渲染进程代码可以直接使用 window.electronAPI 并享有类型提示。
 */
import type { ElectronAPI } from '../../preload/index';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};