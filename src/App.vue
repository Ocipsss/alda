<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useAutoSync } from './composables/useAutoSync'
import BottomNav from './components/layout/BottomNav.vue'

const route = useRoute()
const auth = useAuthStore()

// Sync lifecycle global: timer 30 detik & event online
// berjalan di seluruh aplikasi, tidak hilang saat pindah halaman.
useAutoSync()

// Bottom nav hanya tampil kalau:
// - user sudah login
// - bukan di halaman login (biar login screen bersih)
const showBottomNav = computed(() =>
  auth.isAuthenticated && route.name !== 'login'
)
</script>

<template>
  <div>
    <RouterView />
    <BottomNav v-if="showBottomNav" />
  </div>
</template>