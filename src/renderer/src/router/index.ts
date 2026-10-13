import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'

const router = createRouter({
  // Electron 里推荐用 hash 模式，避免生产环境 file:// 协议下 history 模式失效
  history: createWebHashHistory(),
  routes,
})

export default router