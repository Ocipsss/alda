<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const errorCode = ref('')
const isRegister = ref(false)
const showPassword = ref(false)

async function submit() {
  loading.value = true
  error.value = ''
  errorCode.value = ''

  try {
    if (isRegister.value) {
      await auth.signUp(email.value.trim(), password.value)
    } else {
      await auth.signIn(email.value.trim(), password.value)
    }
    router.push({ name: 'dashboard' })
  } catch (e) {
    errorCode.value = e.code || e.status || ''
    error.value = e.message || 'Terjadi kesalahan'

    console.error('[Login] Failed:', {
      code: e.code,
      status: e.status,
      message: e.message,
      isRegister: isRegister.value
    })

    if (e.message?.toLowerCase().includes('invalid login credentials')) {
      error.value = 'Email atau password salah. Cek huruf besar/kecil & pastikan tidak ada spasi.'
    } else if (e.message?.toLowerCase().includes('email not confirmed')) {
      error.value = 'Email belum dikonfirmasi. Cek inbox atau minta kirim ulang verifikasi.'
    } else if (e.message?.toLowerCase().includes('rate limit') || e.status === 429) {
      error.value = 'Terlalu banyak percobaan. Tunggu 1 menit lalu coba lagi.'
    } else if (e.message?.toLowerCase().includes('user not found')) {
      error.value = 'Email belum terdaftar. Coba daftar dulu.'
    }
  } finally {
    loading.value = false
  }
}

function toggleMode() {
  isRegister.value = !isRegister.value
  error.value = ''
  errorCode.value = ''
  showPassword.value = false
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-5">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
      <h1 class="text-2xl font-bold mb-1">Alda</h1>
      <p class="text-sm text-slate-500 mb-6">{{ isRegister ? 'Buat akun baru' : 'Masuk ke akun' }}</p>

      <form class="space-y-3" @submit.prevent="submit">
        <input
          v-model="email" type="email" placeholder="Email" required
          autocomplete="email"
          class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <!-- Password field with show/hide toggle -->
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Password" required minlength="6"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            class="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
            :title="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
          >
            <EyeOff v-if="showPassword" class="w-4 h-4" />
            <Eye v-else class="w-4 h-4" />
          </button>
        </div>

        <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
          <p>{{ error }}</p>
          <p v-if="errorCode" class="text-xs text-red-400 mt-1 font-mono">[{{ errorCode }}]</p>
        </div>

        <BaseButton size="lg" class="w-full" :loading="loading" type="submit">
          {{ isRegister ? 'Daftar' : 'Masuk' }}
        </BaseButton>
      </form>

      <button
        class="w-full text-center text-sm text-brand-600 mt-4"
        @click="toggleMode"
      >
        {{ isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar' }}
      </button>
    </div>
  </div>
</template>