<script setup>
import { computed } from 'vue'
import { Link } from '@inertiajs/vue3'

const props = defineProps({
  // Paginator from pkg/pagination: { current_page, last_page, total, from, to }
  meta: { type: Object, required: true },
})

function pageUrl(page) {
  const url = new URL(window.location.href)
  url.searchParams.set('page', page)
  return url.pathname + url.search
}

const pages = computed(() => {
  const { current_page: current, last_page: last } = props.meta
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
</script>

<template>
  <div
    v-if="meta.last_page > 1"
    class="flex flex-col items-center gap-2 sm:flex-row sm:justify-between"
  >
    <p class="text-sm opacity-70">Showing {{ meta.from }}–{{ meta.to }} of {{ meta.total }}</p>
    <div class="join">
      <Link
        :href="pageUrl(meta.current_page - 1)"
        class="join-item btn btn-sm"
        :class="{ 'btn-disabled': meta.current_page === 1 }"
        preserve-scroll
      >
        «
      </Link>
      <Link
        v-for="p in pages"
        :key="p"
        :href="pageUrl(p)"
        class="join-item btn btn-sm"
        :class="{ 'btn-active': p === meta.current_page }"
        preserve-scroll
      >
        {{ p }}
      </Link>
      <Link
        :href="pageUrl(meta.current_page + 1)"
        class="join-item btn btn-sm"
        :class="{ 'btn-disabled': meta.current_page === meta.last_page }"
        preserve-scroll
      >
        »
      </Link>
    </div>
  </div>
</template>
