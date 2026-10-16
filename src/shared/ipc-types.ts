/**
 * NexusPoll - IPC 契约定义
 *
 * 主进程与渲染进程共用的类型与通道名。
 * 所有跨进程传递的数据结构都定义在这里，两端引用同一份，
 * 避免出现字段不一致或拼写错误导致的运行时问题。
 */
import type { TagValue } from '../main/drivers/types';

/** IPC 通道名。集中管理，避免字符串散落各处 */
export const IpcChannels = {
  /** 渲染进程主动拉取当前所有设备的快照 */
  DeviceGetSnapshot: 'nexuspoll:device:get-snapshot',
  /** 主进程推送给渲染进程的数据更新事件 */
  DeviceDataUpdate: 'nexuspoll:device:data-update',
  /** 主进程推送给渲染进程的设备状态变化事件 */
  DeviceStatusChange: 'nexuspoll:device:status-change',
} as const;

/** 设备连接状态 */
export type DeviceStatus = 'online' | 'offline' | 'connecting' | 'error';

/** 设备运行时的状态快照 */
export interface DeviceSnapshot {
  deviceId: string;
  name: string;
  status: DeviceStatus;
  lastUpdateAt: number | null;
  /** 该设备最近一次采集到的点位值，key 为 tagId */
  values: Record<string, TagValue>;
}

/** 主进程推送的数据更新事件载荷 */
export interface DeviceDataUpdatePayload {
  deviceId: string;
  timestamp: number;
  values: TagValue[];
}

/** 主进程推送的设备状态变化事件载荷 */
export interface DeviceStatusChangePayload {
  deviceId: string;
  status: DeviceStatus;
  reason?: string;
  timestamp: number;
}