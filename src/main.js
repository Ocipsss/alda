import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Global error handler agar aplikasi tidak "blank" jika ada error runtime
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info)
  // Hanya tampilkan alert di mode development agar user production tidak terganggu
  if (import.meta.env.DEV) {
    alert(`App Error: ${err.message}`)
  }
}

async function bootstrap() {
  const auth = useAuthStore()

  try {
    // Tunggu sampai Supabase selesai mengecek session di background
    await auth.init()
  } catch (e) {
    console.error('Gagal inisialisasi Auth:', e)
    // Tetap lanjutkan mount, agar user bisa melihat halaman login
    // meskipun gagal konek ke Supabase saat pertama kali buka
  }

  // Pasang router guard SETELAH state auth dipastikan siap
  router.beforeEach((to) => {
    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      return { name: 'login' }
    }
    if (to.name === 'login' && auth.isAuthenticated) {
      return { name: 'dashboard' }
    }
  })

  app.mount('#app')
}

bootstrap()