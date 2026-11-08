<script setup>
import { watch, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md' } // sm | md | lg | full
})
const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onUnmounted(() => { document.body.style.overflow = '' })

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full h-full'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
        @click.self="close"
      >
        <Transition name="slide-up" appear>
          <div
            class="bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col"
            :class="[sizeClass[size], size === 'full' ? 'sm:max-w-md sm:rounded-2xl' : '']"
            style="max-height: 92vh;"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 class="font-semibold text-slate-900">{{ title }}</h2>
              <button
                class="p-2 -mr-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition"
                @click="close"
                aria-label="Close"
              >
                <X class="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-5">
              <slot />
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer" class="px-5 py-4 border-t border-slate-100 bg-slate-50">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>