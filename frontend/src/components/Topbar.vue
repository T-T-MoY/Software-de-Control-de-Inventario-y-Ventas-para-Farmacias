<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const userName = ref('Usuario')
const role = ref('')
const isDarkMode = ref(false)

onMounted(() => {
  userName.value = localStorage.getItem('nombreUsuario') || 'Usuario'
  role.value = localStorage.getItem('rolUsuario') || ''
  isDarkMode.value = localStorage.getItem('theme') === 'dark'
})

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  const theme = isDarkMode.value ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-bs-theme', theme)
  localStorage.setItem('theme', theme)
}

const cerrarSesion = async () => {
  const theme = localStorage.getItem('theme') || 'light'
  localStorage.clear()
  localStorage.setItem('theme', theme)
  await router.replace({ name: 'login' })
}

defineEmits(['toggle-sidebar'])
</script>

<template>
  <nav class="navbar topbar px-3 px-md-4 py-3 rounded-4 shadow-sm mb-4">
    <div class="d-flex align-items-center justify-content-between w-100 gap-3">
      <div class="d-flex align-items-center">
        <button
          type="button"
          class="btn btn-link d-lg-none me-3 text-body p-0 text-decoration-none"
          aria-label="Abrir menú"
          @click="$emit('toggle-sidebar')"
        >
          <i class="fas fa-bars fs-4"></i>
        </button>
        <h1 class="h5 mb-0 fw-bold page-title">{{ route.meta.title }}</h1>
      </div>

      <div class="d-flex align-items-center gap-3">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary rounded-pill"
          :aria-label="isDarkMode ? 'Activar tema claro' : 'Activar tema oscuro'"
          @click="toggleTheme"
        >
          <i class="fas" :class="isDarkMode ? 'fa-sun' : 'fa-moon'"></i>
        </button>
        <div class="d-none d-sm-block text-end">
          <div class="small fw-bold">{{ userName }}</div>
          <div class="text-muted" style="font-size: 0.72rem">{{ role }}</div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger rounded-pill" @click="cerrarSesion">
          <i class="fas fa-right-from-bracket me-sm-1"></i>
          <span class="d-none d-sm-inline">Salir</span>
        </button>
      </div>
    </div>
  </nav>
</template>
