<script setup>
import { useTheme } from '@/lib/theme'

const { theme, toggle } = useTheme()
</script>

<template>
  <button
    class="btn btn-ghost btn-square btn-sm"
    :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggle"
  >
    <svg
      v-if="theme === 'dark'"
      xmlns="http://www.w3.org/2000/svg"
      class="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        stroke-linecap="round"
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      class="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      />
    </svg>
  </button>
</template>
