/**
 * NexusPoll - 设备状态 Store
 *
 * 接收主进程推送的设备数据与状态事件，维护渲染进程内的数据副本。
 * IPC 监听在 store 内部注册一次，多个组件从 store 读取，避免重复订阅。
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  DeviceSnapshot,
  DeviceStatus,
  DeviceDataUpdatePayload,
  DeviceStatusChangePayload,
  TagValue,
} from '../../../shared/ipc-types';

/** 渲染进程内维护的设备视图模型 */
export interface DeviceView {
  deviceId: string;
  name: string;
  status: DeviceStatus;
  lastUpdateAt: number | null;
  values: Record<string, TagValue>;
}

export const useDeviceStore = defineStore('device', () => {
  /** 设备视图，key 为 deviceId */
  const devices = ref<Record<string, DeviceView>>({});

  /** 是否已完成初始化（拉过快照 + 挂好监听） */
  const initialized = ref(false);

  /** 取消订阅函数集合，组件卸载时调用（本 store 全局存活，通常不需要） */
  let unsubData: (() => void) | null = null;
  let unsubStatus: (() => void) | null = null;

  /** 设备列表（数组形式，供 v-for 使用） */
  const deviceList = computed(() => Object.values(devices.value));

  /** 在线设备数 */
  const onlineCount = computed(
    () => deviceList.value.filter(d => d.status === 'online').length,
  );

  /** 总点位数 */
  const totalTagCount = computed(() =>
    deviceList.value.reduce((sum, d) => sum + Object.keys(d.values).length, 0),
  );

  /** 最近一次通信时间（所有设备取最大） */
  const lastCommAt = computed(() => {
    let max = 0;
    for (const d of deviceList.value) {
      if (d.lastUpdateAt && d.lastUpdateAt > max) max = d.lastUpdateAt;
    }
    return max || null;
  });

  /** 把快照数据合并进 store */
  function applySnapshot(snapshots: DeviceSnapshot[]): void {
    for (const s of snapshots) {
      devices.value[s.deviceId] = {
        deviceId: s.deviceId,
        name: s.name,
        status: s.status,
        lastUpdateAt: s.lastUpdateAt,
        values: { ...s.values },
      };
    }
  }

  /** 处理数据更新事件 */
  function applyDataUpdate(payload: DeviceDataUpdatePayload): void {
    const dev = devices.value[payload.deviceId];
    if (!dev) return;

    for (const v of payload.values) {
      dev.values[v.tagId] = v;
    }
    dev.lastUpdateAt = payload.timestamp;
  }

  /** 处理状态变化事件 */
  function applyStatusChange(payload: DeviceStatusChangePayload): void {
    const dev = devices.value[payload.deviceId];
    if (!dev) return;
    dev.status = payload.status;
  }

  /**
   * 初始化：拉快照 + 注册 IPC 监听。
   * 多次调用只生效一次。
   */
  async function init(): Promise<void> {
    if (initialized.value) return;
 console.log('[nexuspoll] store.init called');
    const snapshots = await window.electronAPI.device.getSnapshot();
    applySnapshot(snapshots);

    unsubData = window.electronAPI.device.onDataUpdate(applyDataUpdate);
    unsubStatus = window.electronAPI.device.onStatusChange(applyStatusChange);

    initialized.value = true;
  }

  /** 卸载监听。应用退出或热更新时调用 */
  function dispose(): void {
    unsubData?.();
    unsubStatus?.();
    unsubData = null;
    unsubStatus = null;
    initialized.value = false;
  }

  return {
    devices,
    initialized,
    deviceList,
    onlineCount,
    totalTagCount,
    lastCommAt,
    init,
    dispose,
  };
});