import { DeviceDataUpdatePayload, DeviceSnapshot, DeviceStatusChangePayload, IpcChannels } from '@shared/ipc-types';
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
  // ===== 设备采集 =====
  device: {
    /** 拉取所有设备的当前快照，用于页面初始化 */
    getSnapshot: (): Promise<DeviceSnapshot[]> =>
      ipcRenderer.invoke(IpcChannels.DeviceGetSnapshot),

    /** 订阅数据更新事件，返回取消订阅函数 */
    onDataUpdate: (
      callback: (payload: DeviceDataUpdatePayload) => void,
    ): (() => void) => {
      const listener = (_event: unknown, payload: DeviceDataUpdatePayload) =>
        callback(payload);
      ipcRenderer.on(IpcChannels.DeviceDataUpdate, listener);
      return () => ipcRenderer.removeListener(IpcChannels.DeviceDataUpdate, listener);
    },

    /** 订阅设备状态变化事件，返回取消订阅函数 */
    onStatusChange: (
      callback: (payload: DeviceStatusChangePayload) => void,
    ): (() => void) => {
      const listener = (_event: unknown, payload: DeviceStatusChangePayload) =>
        callback(payload);
      ipcRenderer.on(IpcChannels.DeviceStatusChange, listener);
      return () => ipcRenderer.removeListener(IpcChannels.DeviceStatusChange, listener);
    },
  },
};



// 挂载到 window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', api)

// 导出类型，供 .d.ts 文件使用
export type ElectronAPI = typeof api