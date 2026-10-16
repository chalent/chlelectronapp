/**
 * NexusPoll - 设备相关 IPC 处理器
 * 作用：IPC 层桥接。只做参数校验和转发，业务在 PollingService。用公开方法注册回调，不碰 private 字段。
 * 仅负责参数校验与调用转发，不含业务逻辑。
 * 业务状态由 PollingService 维护，本层通过回调把数据推给渲染进程。
 */
import { ipcMain, BrowserWindow } from "electron";
import type { PollingService } from "../services/polling-service";
import {
  IpcChannels,
  type DeviceDataUpdatePayload,
  type DeviceStatusChangePayload,
  type DeviceSnapshot,
} from "../../shared/ipc-types";
import type { TagValue } from "../drivers/types";

/**
 * 注册设备相关的 IPC 处理器。
 * 传入已构建好的 PollingService，本层只负责桥接。
 */
export function registerDeviceHandlers(service: PollingService): void {
  // ===== 渲染进程主动拉取快照 =====
  ipcMain.handle(IpcChannels.DeviceGetSnapshot, (): DeviceSnapshot[] =>
    service.getSnapshot(),
  );

  // ===== 主进程推送给渲染进程 =====
  // PollingService 通过回调外推，本层转成 IPC 事件广播给所有窗口
  service.onDataUpdate((deviceId: string, values: TagValue[]) => {
    const payload: DeviceDataUpdatePayload = {
      deviceId,
      timestamp: Date.now(),
      values,
    };
    broadcast(IpcChannels.DeviceDataUpdate, payload);
  });

  service.onStatusChange((deviceId, status, reason) => {
    const payload: DeviceStatusChangePayload = {
      deviceId,
      status,
      reason,
      timestamp: Date.now(),
    };
    broadcast(IpcChannels.DeviceStatusChange, payload);
  });
}

/** 向所有已打开的窗口广播事件 */
function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}
