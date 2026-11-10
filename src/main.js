import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import { registerSW } from 'virtual:pwa-register'
import './style.css'

// Daftarkan Service Worker untuk PWA
registerSW({ immediate: true })

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Global error handler
app.config.errorHandler = (err) => {
  console.error('Vue Error:', err)
  if (import.meta.env.DEV) alert(`App Error: ${err.message}`)
}

async function bootstrap() {
  const auth = useAuthStore()
  try {
    await auth.init()
  } catch (e) {
    console.error('Gagal inisialisasi Auth:', e)
  }

  // Pasang router guard
  router.beforeEach((to) => {
    if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: 'login' }
    if (to.name === 'login' && auth.isAuthenticated) return { name: 'dashboard' }
  })

  app.mount('#app')
}

bootstrap()