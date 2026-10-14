/**
 * NexusPoll - Mock 设备驱动
 *
 * 用于无硬件条件下的采集链路验证。行为上模拟真实 Modbus 从站，
 * 包含响应延迟、偶发超时等特性，使上层 Service 在开发阶段就能
 * 处理真实场景下的异常分支。
 */
import type {
  DeviceConnection,
  DeviceConfig,
  TagConfig,
  ReadResult,
  TagValue,
} from './types';

export class MockDriver implements DeviceConnection {
  readonly deviceId: string;
  readonly config: DeviceConfig;

  /** 连接状态标志，connect/disconnect 时切换 */
  private connected = false;

  /** 模拟寄存器存储：地址 -> 16 位值 */
  private registers = new Map<number, number>();

  /** 模拟响应延迟区间（ms），每次读取随机取值 */
  private latencyRange: [number, number] = [5, 50];

  /** 模拟单次读取超时概率（0~1），用于触发上层超时分支 */
  private timeoutRate = 0.02;

  constructor(config: DeviceConfig) {
    this.deviceId = config.id;
    this.config = config;

    // 初始化若干寄存器，供冒烟测试读取
    this.registers.set(0, 1234);
    this.registers.set(1, 5678);
    this.registers.set(2, 100);
  }

  /** 返回当前连接状态，供上层轮询调度判断 */
  isConnected(): boolean {
    return this.connected;
  }

  /** 建立连接。模拟握手延迟，置连接标志 */
  async connect(): Promise<void> {
    await this.delay(10);
    this.connected = true;
  }

  /** 断开连接。仅切换标志，幂等 */
  async disconnect(): Promise<void> {
    this.connected = false;
  }

  /**
   * 读取一批 Tag。
   * - 未连接时抛错，由上层决定是否重连
   * - 注入随机延迟与超时，模拟真实从站
   * - 按 tag 逐个从寄存器表取值并解码
   */
  async read(tags: TagConfig[]): Promise<ReadResult> {
    const start = Date.now();

    if (!this.connected) {
      throw new Error('device not connected');
    }

    // 模拟从站响应延迟
    await this.delay(this.randomLatency());

    // 按概率触发超时，让上层轮询逻辑走到异常分支
    if (Math.random() < this.timeoutRate) {
      throw new Error('response timeout');
    }

    const values: TagValue[] = tags.map(tag => {
      const raw = this.registers.get(tag.address) ?? 0;
      return {
        tagId: tag.id,
        value: this.decode(raw, tag),
        raw: [raw],
        timestamp: Date.now(),
        quality: 'good' as const,
      };
    });

    return {
      deviceId: this.deviceId,
      values,
      timestamp: Date.now(),
      durationMs: Date.now() - start,
    };
  }

  /** 释放资源。Mock 无外部句柄，仅复位连接状态 */
  async dispose(): Promise<void> {
    this.connected = false;
  }

  /**
   * 将单个 16 位寄存器值按数据类型解码。
   * 第一步只处理单寄存器类型；多寄存器（int32/float32）后续在字节序处理阶段补齐。
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

  /** 生成一次随机响应延迟 */
  private randomLatency(): number {
    const [min, max] = this.latencyRange;
    return min + Math.random() * (max - min);
  }

  /** Promise 化的 sleep */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}