<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <aside class="sidebar">
    <div class="logo">My App</div>
    <nav>
      <RouterLink to="/">首页</RouterLink>
      <RouterLink to="/settings">设置</RouterLink>
      <RouterLink to="/about">关于</RouterLink>
    </nav>
  </aside>
</template>

<style scoped lang="scss">
.sidebar {
  width: 200px;
  background: var(--color-bg-sidebar);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.logo {
  font-size: 18px;
  font-weight: bold;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 8px;

  a {
    padding: 8px 12px;
    border-radius: 6px;
    text-decoration: none;
    color: inherit;

    &.router-link-active {
      background: var(--color-primary);
      color: #fff;
    }
  }
}
</style>