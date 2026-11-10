<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const isRegister = ref(false)

async function submit() {
  loading.value = true
  error.value = ''
  try {
    if (isRegister.value) {
      await auth.signUp(email.value, password.value)
    } else {
      await auth.signIn(email.value, password.value)
    }
    router.push({ name: 'dashboard' })
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
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
          class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          v-model="password" type="password" placeholder="Password" required minlength="6"
          class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <BaseButton size="lg" class="w-full" :loading="loading" type="submit">
          {{ isRegister ? 'Daftar' : 'Masuk' }}
        </BaseButton>
      </form>

      <button
        class="w-full text-center text-sm text-brand-600 mt-4"
        @click="isRegister = !isRegister"
      >
        {{ isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar' }}
      </button>
    </div>
  </div>
</template>