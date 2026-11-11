<script setup>
import { ref, watch } from 'vue'
import * as LucideIcons from 'lucide-vue-next'
import { Trash2, Palette } from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import IconPicker from '../ui/IconPicker.vue'
import ColorPicker from '../ui/ColorPicker.vue'
import { useWalletStore } from '../../stores/wallet'
import { DEFAULT_WALLET } from '../../constants/wallet'

const props = defineProps({
  modelValue: Boolean,
  wallet: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const store = useWalletStore()
const saving = ref(false)
const showIconPicker = ref(false)
const showColorPicker = ref(false)

function emptyForm() {
  return {
    id: null,
    name: DEFAULT_WALLET.name,
    initial_balance: DEFAULT_WALLET.initial_balance,
    color: DEFAULT_WALLET.color,
    icon: DEFAULT_WALLET.icon
  }
}

const form = ref(emptyForm())

watch(() => props.modelValue, (open) => {
  if (open) {
    form.value = props.wallet ? { ...props.wallet } : emptyForm()
    showIconPicker.value = false
    showColorPicker.value = false
  }
})

function resolveIcon(name) {
  return LucideIcons[name] || LucideIcons.Wallet
}

async function submit() {
  if (!form.value.name.trim()) return
  saving.value = true
  try {
    await store.upsertWallet(form.value)
    emit('saved')
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}

async function removeWallet() {
  if (!form.value.id) return
  if (!confirm('Hapus dompet ini?')) return
  await store.softDeleteWallet(form.value.id)
  emit('deleted')
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :title="form.id ? 'Edit Dompet' : 'Tambah Dompet'"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <!-- Icon + Name -->
      <div class="flex gap-3">
        <button
          type="button"
          class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border-2 border-slate-200"
          :style="{ background: form.color + '20', color: form.color }"
          @click="showIconPicker = true"
        >
          <component :is="resolveIcon(form.icon)" class="w-6 h-6" />
        </button>
        <input
          v-model="form.name"
          placeholder="Nama dompet (mis. Kas Warung)"
          required
          class="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <button
        type="button"
        class="text-sm text-brand-600"
        @click="showIconPicker = true"
      >
        Pilih ikon: <span class="font-medium">{{ form.icon }}</span>
      </button>

      <!-- Initial balance -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Saldo Awal</label>
        <input
          v-model.number="form.initial_balance"
          type="number" inputmode="numeric" step="0.01"
          class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <!-- Color -->
      <div>
        <button
          type="button"
          class="flex items-center gap-2 text-sm text-slate-700 mb-2"
          @click="showColorPicker = !showColorPicker"
        >
          <Palette class="w-4 h-4" /> Warna Tema
        </button>
        <ColorPicker v-if="showColorPicker" v-model="form.color" />
        <div v-else class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full border" :style="{ background: form.color }" />
          <span class="text-sm text-slate-500">{{ form.color }}</span>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex gap-2">
        <BaseButton
          v-if="form.id"
          variant="danger"
          @click="removeWallet"
        >
          <Trash2 class="w-4 h-4 inline mr-1" /> Hapus
        </BaseButton>
        <div class="flex-1" />
        <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Batal</BaseButton>
        <BaseButton :loading="saving" @click="submit">Simpan</BaseButton>
      </div>
    </template>

    <!-- Nested icon picker modal -->
    <BaseModal v-model="showIconPicker" title="Pilih Ikon">
      <IconPicker v-model="form.icon" />
      <template #footer>
        <BaseButton @click="showIconPicker = false">Selesai</BaseButton>
      </template>
    </BaseModal>
  </BaseModal>
</template>