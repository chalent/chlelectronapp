<template>
  <header class="header">
    <div class="title">My Electron App</div>
    <div class="window-controls">
      <!-- 后续接窗口控制按钮 -->
    </div>
  </header>
</template>

<style scoped lang="scss">
.header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-header);
}
</style>