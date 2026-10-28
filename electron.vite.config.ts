import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  // ===== 主进程（Node.js 环境）=====
  main: {
    // v5 默认已 externalizeDeps: true，无需额外配置
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared'),
      },
    },
  },

  // ===== 预加载脚本 =====
  preload: {
    // 同上，v5 默认已处理依赖外部化
    resolve: {
      alias: {
        '@preload': resolve('src/preload'),
        '@shared': resolve('src/shared'),
      },
    },
  },

  // ===== 渲染进程（前端应用）=====
  renderer: {
    root: resolve('src/renderer'),
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
      },
    },
    plugins: [vue()],
    server: {
      port: 5173,
    },
  },
})