<script setup lang="ts">
/**
 * NexusPoll - 首页
 *
 * 展示设备实时监控面板。
 * 页面挂载时初始化设备 store（拉快照 + 订阅推送），
 * 卸载时不做清理——store 全局存活，避免路由切换时重复订阅。
 */
import { onMounted } from 'vue';
import { useDeviceStore } from '@/stores/device-store';
import DevicePanel from '@/components/DevicePanel.vue';
import WelcomeCard from './components/welcomeCard.vue';

const store = useDeviceStore();

onMounted(() => {
  void store.init();
});
</script>

<template>
  <div class="home">
    <WelcomeCard />

    <section class="monitor-section">
      <h2 class="section-title">设备监控</h2>
      <div v-if="store.deviceList.length === 0" class="empty-hint">
        暂无已注册设备
      </div>
      <DevicePanel
        v-for="device in store.deviceList"
        :key="device.deviceId"
        :device="device"
      />
    </section>
  </div>
</template>

<style scoped lang="scss">
.home {
  padding: 10px;
}

.monitor-section {
  margin-top: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1565c0;
}

.empty-hint {
  padding: 24px;
  text-align: center;
  color: #aaa;
  background: #fafafa;
  border-radius: 6px;
}
</style>