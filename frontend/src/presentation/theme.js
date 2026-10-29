import { ref } from 'vue'

const THEME_KEY = 'theme'

export const currentTheme = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem(THEME_KEY) === 'dark'
    ? 'dark'
    : 'light'
)

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light'
  const root = document.documentElement

  root.setAttribute('data-theme', nextTheme)
  root.setAttribute('data-bs-theme', nextTheme)
  localStorage.setItem(THEME_KEY, nextTheme)
  currentTheme.value = nextTheme

  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) {
    themeColor.setAttribute('content', nextTheme === 'dark' ? '#05102D' : '#FFF7E3')
  }

  return nextTheme
}

export function toggleTheme(theme) {
  return applyTheme(theme === 'dark' ? 'light' : 'dark')
}
