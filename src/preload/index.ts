import { contextBridge, ipcRenderer } from 'electron'

// 向渲染进程暴露的 API
const api = {
  system: {
    getPlatform: (): Promise<NodeJS.Platform> =>
      ipcRenderer.invoke('system:get-platform'),
  },
  window: {
    minimize: (): void => {
      ipcRenderer.send('window:minimize')
    },
    close: (): void => {
      ipcRenderer.send('window:close')
    },
  },
}

// 挂载到 window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', api)

// 导出类型，供 .d.ts 文件使用
export type ElectronAPI = typeof api