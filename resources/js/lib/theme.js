import { ref } from 'vue'

const STORAGE_KEY = 'theme'

function initialTheme() {
  const saved = document.documentElement.dataset.theme
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const theme = ref(typeof window === 'undefined' ? 'light' : initialTheme())

/** Light/dark theme toggle, remembered in localStorage. */
export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme.value
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    } catch {
      // storage unavailable (private mode) — theme still applies for this page
    }
  }
  return { theme, toggle }
}
