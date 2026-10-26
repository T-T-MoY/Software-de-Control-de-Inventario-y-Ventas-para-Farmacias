<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { applyTheme, getStoredTheme } from '../services/theme'

const route = useRoute()
const router = useRouter()
const userName = ref('Usuario')
const role = ref('')
const isDarkMode = ref(false)

const initials = computed(() => {
  const parts = userName.value.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
})

onMounted(() => {
  userName.value = localStorage.getItem('nombreUsuario') || 'Usuario'
  role.value = localStorage.getItem('rolUsuario') || ''
  isDarkMode.value = getStoredTheme() === 'dark'
})

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  applyTheme(isDarkMode.value ? 'dark' : 'light')
}

const cerrarSesion = async () => {
  const theme = getStoredTheme()
  localStorage.clear()
  localStorage.setItem('theme', theme)
  await router.replace({ name: 'login' })
}

defineEmits(['toggle-sidebar'])
</script>

<template>
  <nav class="navbar topbar px-3 px-md-4 py-3 mb-4">
    <div class="d-flex align-items-center justify-content-between w-100 gap-3">
      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="icon-btn d-lg-none"
          aria-label="Abrir menú"
          @click="$emit('toggle-sidebar')"
        >
          <i class="fas fa-bars"></i>
        </button>
        <div>
          <div class="topbar-eyebrow d-none d-sm-block">Panel administrativo</div>
          <h1 class="h5 mb-0 fw-bold page-title">{{ route.meta.title }}</h1>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2 gap-sm-3">
        <button
          type="button"
          class="icon-btn"
          :aria-label="isDarkMode ? 'Activar tema claro' : 'Activar tema oscuro'"
          :title="isDarkMode ? 'Activar tema claro' : 'Activar tema oscuro'"
          @click="toggleTheme"
        >
          <i class="fas" :class="isDarkMode ? 'fa-sun' : 'fa-moon'"></i>
        </button>

        <div class="user-chip d-none d-md-flex">
          <span class="avatar">{{ initials }}</span>
          <div class="text-end">
            <div class="user-chip-name">{{ userName }}</div>
            <div class="user-chip-role">{{ role || 'Sesión activa' }}</div>
          </div>
        </div>

        <button type="button" class="btn btn-sm btn-ghost rounded-pill px-3" @click="cerrarSesion">
          <i class="fas fa-arrow-right-from-bracket"></i>
          <span class="d-none d-sm-inline ms-1">Salir</span>
        </button>
      </div>
    </div>
  </nav>
</template>
