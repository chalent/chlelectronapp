/**
 * NexusPoll - Modbus TCP 驱动
 *
 * 基于 modbus-serial 实现标准 Modbus TCP 客户端。
 * 负责建立 TCP 连接、按 Tag 读取寄存器、以及断开连接。
 * 轮询调度、重连策略、离线判定由上层 PollingService 负责，本类不涉及。
 */
import ModbusRTU from 'modbus-serial';
import type {
  DeviceConnection,
  DeviceConfig,
  TagConfig,
  ReadResult,
  TagValue,
} from './types';

export class ModbusTcpDriver implements DeviceConnection {
  readonly deviceId: string;
  readonly config: DeviceConfig;

  /** modbus-serial 客户端实例，一个驱动持有一个连接 */
  private client: ModbusRTU;

  /** 连接状态标志，connect/disconnect 时切换 */
  private connected = false;

  constructor(config: DeviceConfig) {
    this.deviceId = config.id;
    this.config = config;
    this.client = new ModbusRTU();
  }

  /** 返回当前连接状态，供上层轮询调度判断 */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 建立 TCP 连接。
   * - host/port 必填，缺失时提前抛错，避免底层库抛出的错误信息不直观
   * - 设置 Unit ID 与超时，后续读写都走这两个参数
   */
  async connect(): Promise<void> {
    if (!this.config.host || !this.config.port) {
      throw new Error(`device ${this.deviceId}: host/port not configured`);
    }

    await this.client.connectTCP(this.config.host, { port: this.config.port });
    this.client.setID(this.config.unitId);
    this.client.setTimeout(this.config.timeoutMs);
    this.connected = true;
  }

  /**
   * 断开连接。幂等，未连接时调用也不报错。
   * close 是异步回调形式，这里不等待回调，仅发起关闭动作。
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return;
    this.client.close(() => { /* noop */ });
    this.connected = false;
  }

  /**
   * 读取一批 Tag。
   * - 未连接时抛错，由上层决定是否触发重连
   * - 逐个 Tag 读取，暂不做连续地址合并优化
   * - 单次超时由 client.setTimeout 控制，超时错误直接抛给上层
   */
  async read(tags: TagConfig[]): Promise<ReadResult> {
    const start = Date.now();

    if (!this.connected) {
      throw new Error(`device ${this.deviceId}: not connected`);
    }

    const values: TagValue[] = [];

    for (const tag of tags) {
      let raw: number[];

      if (tag.registerType === 'holding') {
        const resp = await this.client.readHoldingRegisters(tag.address, 1);
        raw = resp.data;
      } else {
        const resp = await this.client.readInputRegisters(tag.address, 1);
        raw = resp.data;
      }

      values.push({
        tagId: tag.id,
        value: this.decode(raw[0], tag),
        raw,
        timestamp: Date.now(),
        quality: 'good',
      });
    }

    return {
      deviceId: this.deviceId,
      values,
      timestamp: Date.now(),
      durationMs: Date.now() - start,
    };
  }

  /** 释放资源。等价于断开连接，供上层统一销毁 */
  async dispose(): Promise<void> {
    await this.disconnect();
  }

  /**
   * 将寄存器原始值按数据类型解码。
   * 第一步只处理单寄存器类型；多寄存器（int32/float32）后续结合 byteOrder 补齐。
   */
  private decode(raw: number, tag: TagConfig): number | boolean {
    switch (tag.dataType) {
      case 'uint16':
        return raw & 0xffff;
      case 'int16':
        return (raw << 16) >> 16;
      case 'bool':
        return raw !== 0;
      default:
        return raw;
    }
  }
}