const THEME_KEY = 'theme'

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light'
  const root = document.documentElement

  root.setAttribute('data-theme', nextTheme)
  root.setAttribute('data-bs-theme', nextTheme)
  localStorage.setItem(THEME_KEY, nextTheme)

  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) {
    themeColor.setAttribute('content', nextTheme === 'dark' ? '#05102D' : '#FFF7E3')
  }

  return nextTheme
}

export function toggleTheme(currentTheme) {
  return applyTheme(currentTheme === 'dark' ? 'light' : 'dark')
}
