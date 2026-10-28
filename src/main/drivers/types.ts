/**
 * NexusPoll - 设备连接抽象层
 *
 * 定义统一的 DeviceConnection 接口，屏蔽底层通信差异（Modbus TCP / RTU / Mock）。
 * 上层 PollingService 只依赖此接口，不感知具体驱动实现。
 */

import { TagValue } from "@shared/ipc-types";

export type ByteOrder = 'AB' | 'BA' | 'ABCD' | 'CDAB';

export type RegisterType = 'holding' | 'input';

export type DataType = 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32' | 'bool';

export type DeviceMode = 'mock' | 'local' | 'real';

export interface DeviceConfig {
  id: string;
  name: string;
  mode: DeviceMode;
  host?: string;
  port?: number;
  unitId: number;
  pollIntervalMs: number;
  timeoutMs: number;
}

export interface TagConfig {
  id: string;
  deviceId: string;
  name: string;
  registerType: RegisterType;
  address: number;
  dataType: DataType;
  byteOrder: ByteOrder;
  unit?: string;
  writable: boolean;
}



export interface ReadResult {
  deviceId: string;
  values: TagValue[];
  timestamp: number;
  durationMs: number;
}

export interface DeviceConnection {
  readonly deviceId: string;
  readonly config: DeviceConfig;
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  read(tags: TagConfig[]): Promise<ReadResult>;
  dispose(): Promise<void>;
}