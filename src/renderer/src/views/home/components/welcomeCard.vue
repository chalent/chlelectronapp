<script setup lang="ts">
import { ref, onMounted } from 'vue'

const platform = ref('')

onMounted(async () => {
  // 通过 preload 暴露的 API 获取平台信息
  platform.value = await window.electronAPI.system.getPlatform()
})
</script>

<template>
  <div class="welcome-card">
    <h1>欢迎使用 My Electron App</h1>
    <p>当前平台：{{ platform || '检测中...' }}</p>
  </div>
</template>

<style scoped lang="scss">
.welcome-card {
  padding: 24px;
  border-radius: 8px;
  background: var(--color-bg-card);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  h1 {
    font-size: 20px;
    margin-bottom: 12px;
  }
}
</style>