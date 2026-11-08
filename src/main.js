import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { supabase } from './lib/supabase'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Global auth guard minimal
router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (to.meta.requiresAuth && !session) return { name: 'login' }
  if (to.name === 'login' && session) return { name: 'dashboard' }
})

app.mount('#app')