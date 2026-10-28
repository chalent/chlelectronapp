import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 全局样式
import '@/assets/styles/index.scss';

console.log("Renderer process started")

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')