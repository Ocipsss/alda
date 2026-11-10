import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Tampilkan error di layar jika ada crash
app.config.errorHandler = (err) => {
  console.error(err)
  alert('App Error: ' + err.message)
}

async function bootstrap() {
  const auth = useAuthStore()
  try {
    await auth.init()
  } catch (e) {
    alert('Gagal inisialisasi Auth: ' + e.message)
  }

  router.beforeEach((to) => {
    if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: 'login' }
    if (to.name === 'login' && auth.isAuthenticated) return { name: 'dashboard' }
  })

  app.mount('#app')
}

bootstrap()