<script setup>
import { computed } from 'vue'
import { applyTheme, currentTheme } from '../services/theme'

const isDark = computed(() => currentTheme.value === 'dark')
const label = computed(() => (
  isDark.value ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
))

const toggleTheme = () => applyTheme(isDark.value ? 'light' : 'dark')
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :title="label"
    :aria-label="label"
    @click="toggleTheme"
  >
    <!-- Luna: se muestra en modo claro -->
    <svg
      v-if="!isDark"
      class="theme-toggle-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>

    <!-- Sol: se muestra en modo oscuro -->
    <svg
      v-else
      class="theme-toggle-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  background: var(--accent-soft);
  color: var(--text-accent);
  box-shadow: var(--shadow-sm);
  transition: background-color 0.25s ease, border-color 0.25s ease,
    color 0.25s ease, opacity 0.25s ease, transform 0.18s ease;
}

.theme-toggle:hover {
  background: var(--lavender-soft);
  border-color: var(--accent);
  opacity: 0.85;
  transform: translateY(-1px);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.theme-toggle-icon {
  width: 20px;
  height: 20px;
}

@media (prefers-reduced-motion: reduce) {
  .theme-toggle {
    transition: none;
  }

  .theme-toggle:hover {
    transform: none;
  }
}
</style>
