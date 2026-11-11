import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const ready = ref(false)

  const isAuthenticated = computed(() => !!session.value)

  async function init() {
    if (ready.value) return

    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.warn('[auth.init] getSession error:', error.message)
        // Session corrupt (misal setelah clear site data) → force clear
        try {
          await supabase.auth.signOut({ scope: 'local' })
        } catch (e) {
          console.warn('[auth.init] force signOut failed:', e.message)
        }
      } else {
        session.value = data?.session ?? null
        user.value = data?.session?.user ?? null
      }
    } catch (e) {
      console.error('[auth.init] exception:', e)
      session.value = null
      user.value = null
    } finally {
      ready.value = true
    }

    supabase.auth.onAuthStateChange((_event, s) => {
      session.value = s
      user.value = s?.user ?? null
    })
  }

  async function signIn(email, password) {
    // Bersihkan session lama dulu (fix: session korup setelah clear site data)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch (e) {
      console.warn('[auth.signIn] pre-signOut failed:', e.message)
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error('[auth.signIn] error:', {
        status: error.status,
        code: error.code,
        message: error.message
      })
      throw error
    }

    session.value = data.session
    user.value = data.user
    return data
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      console.error('[auth.signUp] error:', {
        status: error.status,
        code: error.code,
        message: error.message
      })
      throw error
    }
    return data
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('[auth.signOut] error:', e.message)
    } finally {
      session.value = null
      user.value = null
    }
  }

  return { user, session, ready, isAuthenticated, init, signIn, signUp, signOut }
})