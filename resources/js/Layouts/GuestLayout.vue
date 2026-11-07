<script setup>
import { computed } from 'vue'
import { Link, usePage } from '@inertiajs/vue3'
import FlashMessages from '@/Components/FlashMessages.vue'
import ThemeToggle from '@/Components/ThemeToggle.vue'

defineProps({
  title: { type: String, default: '' },
})

const page = usePage()
const appName = computed(() => page.props.appName ?? 'GoMVC')
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
    <div class="absolute top-4 right-4"><ThemeToggle /></div>
    <Link href="/" class="text-3xl font-bold">{{ appName }}</Link>

    <div class="card w-full max-w-md border border-base-300 bg-base-100 shadow-sm">
      <div class="card-body">
        <h1 v-if="title" class="card-title text-2xl">{{ title }}</h1>
        <slot />
      </div>
    </div>

    <slot name="footer" />
    <FlashMessages />
  </div>
</template>
