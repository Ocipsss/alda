<script setup>
import { ref } from 'vue'
import { Plus, Wallet } from 'lucide-vue-next'
import BaseModal from '../components/ui/BaseModal.vue'
import BaseButton from '../components/ui/BaseButton.vue'

const showAddWallet = ref(false)
</script>

<template>
  <div class="min-h-screen pb-20">
    <header class="px-5 pt-6 pb-4">
      <h1 class="text-2xl font-bold">Alda</h1>
      <p class="text-sm text-slate-500">Multi-wallet cash flow</p>
    </header>

    <main class="px-5 space-y-4">
      <section class="bg-brand-600 text-white rounded-2xl p-5 shadow-lg">
        <p class="text-sm opacity-80">Total Saldo</p>
        <p class="text-3xl font-bold mt-1">Rp 0</p>
      </section>

      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">Dompet</h2>
          <button
            class="flex items-center gap-1 text-sm text-brand-600 font-medium"
            @click="showAddWallet = true"
          >
            <Plus class="w-4 h-4" /> Tambah
          </button>
        </div>
        <div class="bg-white rounded-xl p-6 text-center border border-slate-200">
          <Wallet class="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p class="text-sm text-slate-500">Belum ada dompet</p>
        </div>
      </section>
    </main>

    <BaseModal v-model="showAddWallet" title="Tambah Dompet">
      <p class="text-sm text-slate-500">Form tambah dompet akan diimplementasikan di Fase 2.</p>
      <template #footer>
        <BaseButton @click="showAddWallet = false">Tutup</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>