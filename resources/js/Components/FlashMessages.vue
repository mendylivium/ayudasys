<script setup>
import { ref, watch } from 'vue'
import { usePage } from '@inertiajs/vue3'

const page = usePage()
const messages = ref([])
let nextId = 0

const kinds = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
}

function dismiss(id) {
  messages.value = messages.value.filter((m) => m.id !== id)
}

watch(
  () => page.props.flash,
  (flash) => {
    for (const [kind, text] of Object.entries(flash ?? {})) {
      if (!text) continue
      const id = ++nextId
      messages.value.push({ id, kind, text })
      setTimeout(() => dismiss(id), 4000)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="toast toast-end z-50">
    <TransitionGroup name="toast">
      <div
        v-for="m in messages"
        :key="m.id"
        role="alert"
        class="alert shadow-lg"
        :class="kinds[m.kind] ?? 'alert-info'"
      >
        <span>{{ m.text }}</span>
        <button class="btn btn-ghost btn-xs" aria-label="Dismiss" @click="dismiss(m.id)">✕</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(1rem);
}
</style>
