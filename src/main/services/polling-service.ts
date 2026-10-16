/**
 * NexusPoll - 轮询服务
 *
 * 负责管理多个设备连接的轮询调度、数据缓存与状态追踪。
 * 不依赖 electron，通过回调将数据与状态变化外推给上层（IPC 层）。
 * 驱动层只负责单次读写，轮询周期、失败计数、重连退避都在这里控制。
 */
import type {
  DeviceConnection,
  DeviceConfig,
  TagConfig,
  TagValue,
} from "../drivers/types";
import type { DeviceStatus } from "../../shared/ipc-types";

/** 单设备的运行时状态 */
interface DeviceRuntime {
  config: DeviceConfig;
  connection: DeviceConnection;
  tags: TagConfig[];
  status: DeviceStatus;
  /** 连续失败次数，达到阈值标记离线 */
  failureCount: number;
  /** 最近一次采集到的值，key 为 tagId */
  latestValues: Map<string, TagValue>;
  /** 轮询定时器 */
  timer: NodeJS.Timeout | null;
  /** 上一次请求是否还在进行中，防止串包 */
  inFlight: boolean;
  lastUpdateAt: number | null;
}

/** 数据更新回调 */
export type DataUpdateCallback = (deviceId: string, values: TagValue[]) => void;

/** 状态变化回调 */
export type StatusChangeCallback = (
  deviceId: string,
  status: DeviceStatus,
  reason?: string,
) => void;

/** 连续失败多少次判定离线 */
const OFFLINE_THRESHOLD = 3;

export class PollingService {
  private devices = new Map<string, DeviceRuntime>();

  private dataUpdateCallbacks: DataUpdateCallback[] = [];
  /** 支持多个状态变化监听者 */
  private statusChangeCallbacks: StatusChangeCallback[] = [];
  // private onDataUpdate: DataUpdateCallback;
  // private onStatusChange: StatusChangeCallback;

  // constructor(options: {
  //   onDataUpdate: DataUpdateCallback;
  //   onStatusChange: StatusChangeCallback;
  // }) {
  //   this.onDataUpdate = options.onDataUpdate;
  //   this.onStatusChange = options.onStatusChange;
  // }

  /** 注册数据更新回调，可多次调用 */
  onDataUpdate(cb: DataUpdateCallback): void {
    this.dataUpdateCallbacks.push(cb);
  }

  /** 注册状态变化回调，可多次调用 */
  onStatusChange(cb: StatusChangeCallback): void {
    this.statusChangeCallbacks.push(cb);
  }

  /**
   * 注册一个设备并启动轮询。
   * connection 由调用方按 mode 创建好后传入，本服务不关心具体驱动类型。
   */
  registerDevice(
    config: DeviceConfig,
    tags: TagConfig[],
    connection: DeviceConnection,
  ): void {
    if (this.devices.has(config.id)) {
      throw new Error(`device ${config.id} already registered`);
    }

    const runtime: DeviceRuntime = {
      config,
      connection,
      tags,
      status: "offline",
      failureCount: 0,
      latestValues: new Map(),
      timer: null,
      inFlight: false,
      lastUpdateAt: null,
    };

    this.devices.set(config.id, runtime);
    void this.startDevice(runtime);
  }

  /** 返回所有设备的快照，供渲染进程初始化时拉取 */
  getSnapshot() {
    return Array.from(this.devices.values()).map((rt) => ({
      deviceId: rt.config.id,
      name: rt.config.name,
      status: rt.status,
      lastUpdateAt: rt.lastUpdateAt,
      values: Object.fromEntries(rt.latestValues),
    }));
  }

  /** 停止所有设备轮询并释放连接 */
  async shutdown(): Promise<void> {
    for (const rt of this.devices.values()) {
      if (rt.timer) clearTimeout(rt.timer);
      await rt.connection.dispose().catch(() => {
        /* noop */
      });
    }
    this.devices.clear();
  }

  // ===== 内部实现 =====

  /** 首次连接并启动轮询循环 */
  private async startDevice(rt: DeviceRuntime): Promise<void> {
    await this.ensureConnected(rt);
    this.scheduleNext(rt);
  }

  /**
   * 安排下一次轮询。
   * 用 setTimeout 递归而不是 setInterval，保证上一轮结束后再排下一轮，
   * 从根本上避免请求堆叠。
   */
  private scheduleNext(rt: DeviceRuntime): void {
    rt.timer = setTimeout(() => {
      void this.pollOnce(rt);
    }, rt.config.pollIntervalMs);
  }

  /** 执行一次轮询：读 → 推 → 排下一轮 */
  private async pollOnce(rt: DeviceRuntime): Promise<void> {
    // 防串包：上一次还没返回就不发
    if (rt.inFlight) {
      this.scheduleNext(rt);
      return;
    }

    if (!rt.connection.isConnected()) {
      await this.ensureConnected(rt);
      if (!rt.connection.isConnected()) {
        this.scheduleNext(rt);
        return;
      }
    }

    rt.inFlight = true;
    try {
      const result = await rt.connection.read(rt.tags);
      rt.failureCount = 0;
      rt.lastUpdateAt = result.timestamp;

      for (const v of result.values) {
        rt.latestValues.set(v.tagId, v);
      }

      // 首次成功或从离线恢复时，把状态推到 online
      if (rt.status !== "online") {
        this.updateStatus(rt, "online");
      }

      // 遍历所有监听者外推
      for (const cb of this.dataUpdateCallbacks) {
        cb(rt.config.id, result.values);
      }
    } catch (err) {
      this.handleReadError(rt, err);
    } finally {
      rt.inFlight = false;
      this.scheduleNext(rt);
    }
  }

  /** 确保连接可用。失败时标记状态，不抛错 */
  private async ensureConnected(rt: DeviceRuntime): Promise<void> {
    if (rt.connection.isConnected()) return;

    this.updateStatus(rt, "connecting");
    try {
      await rt.connection.connect();
      this.updateStatus(rt, "online");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.updateStatus(rt, "offline", reason);
    }
  }

  /** 处理一次读取失败：累加失败计数，达阈值标记离线 */
  private handleReadError(rt: DeviceRuntime, err: unknown): void {
    rt.failureCount += 1;
    const reason = err instanceof Error ? err.message : String(err);

    if (rt.failureCount >= OFFLINE_THRESHOLD && rt.status !== "offline") {
      this.updateStatus(rt, "offline", reason);
      // 断开底层连接，下一次轮询会走重连逻辑
      void rt.connection.disconnect().catch(() => {
        /* noop */
      });
    } else {
      this.updateStatus(rt, "error", reason);
    }
  }

  /** 状态变化时通过回调外推 */
  private updateStatus(
    rt: DeviceRuntime,
    status: DeviceStatus,
    reason?: string,
  ): void {
    if (rt.status === status && !reason) return;
    rt.status = status;
    // 遍历所有监听者外推
    for (const cb of this.statusChangeCallbacks) {
      cb(rt.config.id, status, reason);
    }
  }
}
