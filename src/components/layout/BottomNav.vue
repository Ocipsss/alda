<script setup>
import { useRoute, useRouter } from 'vue-router'
import { Home, Receipt, Wallet, Settings as SettingsIcon } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'dashboard', label: 'Beranda', icon: Home },
  { name: 'transactions', label: 'Transaksi', icon: Receipt },
  { name: 'wallets', label: 'Dompet', icon: Wallet },
  { name: 'settings', label: 'Setting', icon: SettingsIcon }
]

// Tab aktif juga saat berada di sub-route (misal /wallets/:id tetap aktif di tab Wallets)
const activeTab = {
  'wallet-detail': 'wallets'
}

function isActive(name) {
  if (route.name === name) return true
  return activeTab[route.name] === name
}

function go(name) {
  if (route.name !== name) router.push({ name })
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 bottom-nav-safe">
    <div class="grid grid-cols-4">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        @click="go(tab.name)"
        class="flex flex-col items-center justify-center py-2 gap-0.5 transition"
        :class="isActive(tab.name) ? 'text-brand-600' : 'text-slate-500'"
      >
        <component
          :is="tab.icon"
          class="w-5 h-5"
          :stroke-width="isActive(tab.name) ? 2.5 : 2"
        />
        <span class="text-[10px] font-medium">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav-safe {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>