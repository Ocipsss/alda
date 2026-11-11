import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import { registerSW } from 'virtual:pwa-register'
import './style.css'

registerSW({ immediate: true })

const app = createApp(App)
app.use(createPinia())

// ⚠️ Guard HARUS dipasang SEBELUM app.use(router)
// agar navigasi awal (buka app) tervalidasi
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.ready) {
    try {
      await auth.init()
    } catch (e) {
      console.error('[Guard] auth.init failed:', e)
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

app.use(router)

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info)
}

app.mount('#app')