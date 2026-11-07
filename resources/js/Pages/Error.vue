<script setup>
import { computed } from 'vue'
import { Head, Link } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'

const props = defineProps({
  status: { type: Number, required: true },
  message: { type: String, default: '' },
})

const titles = {
  403: 'Forbidden',
  404: 'Page not found',
  419: 'Page expired',
  429: 'Too many requests',
  500: 'Server error',
  503: 'Service unavailable',
}

const descriptions = {
  403: "You don't have permission to access this page.",
  404: "Sorry, the page you're looking for doesn't exist.",
  419: 'Your session has expired. Please refresh and try again.',
  429: 'Slow down a little and try again in a minute.',
  500: 'Whoops, something went wrong on our servers.',
  503: "We're doing some maintenance. Please check back soon.",
}

const title = computed(() => titles[props.status] ?? 'Error')
const description = computed(() => descriptions[props.status] ?? props.message)
</script>

<template>
  <AppLayout>
    <Head :title="title" />
    <div class="flex flex-col items-center py-20 text-center">
      <p class="text-7xl font-black text-primary">{{ status }}</p>
      <h1 class="mt-4 text-2xl font-bold">{{ title }}</h1>
      <p class="mt-2 max-w-md text-base-content/70">{{ description }}</p>
      <Link href="/" class="btn btn-primary mt-8">Back to home</Link>
    </div>
  </AppLayout>
</template>
