<script setup lang="ts">
/**
 * NexusPoll - 设备面板
 *
 * 展示单台设备的连接状态与实时点位值。
 * 数据来自 device-store，组件本身不注册 IPC 监听。
 */
import { computed } from 'vue';
// import { useDeviceStore } from '../stores/device-store';
import type { DeviceView } from '../stores/device-store';

const props = defineProps<{
  device: DeviceView;
}>();

// const store = useDeviceStore();

/** 状态文字与颜色 */
const statusMeta = computed(() => {
  const map = {
    online: { label: '在线', class: 'status-online' },
    offline: { label: '离线', class: 'status-offline' },
    connecting: { label: '连接中', class: 'status-connecting' },
    error: { label: '异常', class: 'status-error' },
  } as const;
  return map[props.device.status];
});

/** 点位行列表 */
const tagRows = computed(() =>
  Object.values(props.device.values).map(v => ({
    ...v,
    display: typeof v.value === 'boolean' ? (v.value ? 'ON' : 'OFF') : v.value,
  })),
);

/** 最近通信时间格式化 */
const lastUpdateText = computed(() => {
  if (!props.device.lastUpdateAt) return '—';
  const d = new Date(props.device.lastUpdateAt);
  return d.toLocaleTimeString();
});
</script>

<template>
  <section class="device-panel">
    <header class="device-header">
      <div class="device-title">
        <span class="device-name">{{ device.name }}</span>
        <span class="device-id">{{ device.deviceId }}</span>
      </div>
      <div class="device-meta">
        <span :class="['status-badge', statusMeta.class]">{{ statusMeta.label }}</span>
        <span class="last-update">更新于 {{ lastUpdateText }}</span>
      </div>
    </header>

    <table class="tag-table">
      <thead>
        <tr>
          <th>点位</th>
          <th>值</th>
          <th>质量</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in tagRows" :key="row.tagId">
          <td class="tag-id">{{ row.tagId }}</td>
          <td class="tag-value">{{ row.display }}</td>
          <td>
            <span :class="['quality', row.quality]">{{ row.quality }}</span>
          </td>
          <td class="tag-time">
            {{ new Date(row.timestamp).toLocaleTimeString() }}
          </td>
        </tr>
        <tr v-if="tagRows.length === 0">
          <td colspan="4" class="empty">暂无数据</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.device-panel {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.device-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.device-name {
  font-size: 16px;
  font-weight: 600;
  color: #222;
}

.device-id {
  font-size: 12px;
  color: #888;
}

.device-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.status-online {
  background: #e6f4ea;
  color: #1e8e3e;
}

.status-offline {
  background: #f1f1f1;
  color: #666;
}

.status-connecting {
  background: #fef7e0;
  color: #b06000;
}

.status-error {
  background: #fce8e6;
  color: #c5221f;
}

.last-update {
  font-size: 12px;
  color: #888;
}

.tag-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tag-table th,
.tag-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.tag-table th {
  font-weight: 500;
  color: #666;
  background: #fafafa;
}

.tag-value {
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  color: #1565c0;
}

.tag-time {
  color: #888;
  font-size: 12px;
}

.quality {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;
}

.quality.good {
  background: #e6f4ea;
  color: #1e8e3e;
}

.quality.bad {
  background: #fce8e6;
  color: #c5221f;
}

.empty {
  text-align: center;
  color: #aaa;
  padding: 16px;
}
</style>