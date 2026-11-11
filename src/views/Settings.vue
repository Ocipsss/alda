<script setup>
import { useRouter } from 'vue-router'
import {
  HandCoins,
  Tag,
  Split,
  BarChart3,
  LogOut,
  Info,
  ChevronRight
} from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { APP_NAME } from '../constants/app'

const router = useRouter()
const auth = useAuthStore()

async function handleLogout() {
  if (!confirm('Keluar dari akun?')) return
  await auth.signOut()
  router.push({ name: 'login' })
}

function go(name) {
  router.push({ name })
}
</script>

<template>
  <div class="min-h-screen pb-24">
    <header class="px-5 pt-6 pb-4">
      <h1 class="text-2xl font-bold">Pengaturan</h1>
      <p class="text-xs text-slate-500 truncate">{{ auth.user?.email }}</p>
    </header>

    <main class="px-5 space-y-4">
      <!-- Keuangan -->
      <section>
        <h2 class="text-xs font-semibold text-slate-500 uppercase mb-2 px-1">Keuangan</h2>
        <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          <button
            @click="go('debts')"
            class="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition text-left"
          >
            <div class="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <HandCoins class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm">Pinjaman</p>
              <p class="text-xs text-slate-500">Utang & piutang</p>
            </div>
            <ChevronRight class="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <button
            @click="go('categories')"
            class="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition text-left"
          >
            <div class="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Tag class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm">Kategori</p>
              <p class="text-xs text-slate-500">Kelola kategori transaksi</p>
            </div>
            <ChevronRight class="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>
      </section>

      <!-- Riwayat & Analitik -->
      <section>
        <h2 class="text-xs font-semibold text-slate-500 uppercase mb-2 px-1">
          Riwayat & Analitik
        </h2>
        <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          <button
            @click="go('reports')"
            class="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition text-left"
          >
            <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BarChart3 class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm">Laporan</p>
              <p class="text-xs text-slate-500">Analisis keuangan bulanan</p>
            </div>
            <ChevronRight class="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <button
            @click="go('split-bills')"
            class="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition text-left"
          >
            <div class="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Split class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm">Split Payment</p>
              <p class="text-xs text-slate-500">Riwayat pembayaran multi-wallet</p>
            </div>
            <ChevronRight class="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>
      </section>

      <!-- Akun -->
      <section>
        <h2 class="text-xs font-semibold text-slate-500 uppercase mb-2 px-1">Akun</h2>
        <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          <button
            @click="handleLogout"
            class="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition text-left"
          >
            <div class="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <LogOut class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm text-red-600">Keluar</p>
              <p class="text-xs text-slate-500">Logout dari akun ini</p>
            </div>
          </button>
        </div>
      </section>

      <!-- Tentang -->
      <section>
        <h2 class="text-xs font-semibold text-slate-500 uppercase mb-2 px-1">Tentang</h2>
        <div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Info class="w-5 h-5" />
          </div>
          <div class="flex-1">
            <p class="font-medium text-sm">{{ APP_NAME }}</p>
            <p class="text-xs text-slate-500">Versi 1.0.0</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>