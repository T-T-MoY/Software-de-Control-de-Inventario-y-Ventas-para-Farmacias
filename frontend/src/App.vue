<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from './presentation/components/Sidebar.vue'
import Topbar from './presentation/components/Topbar.vue'
import ToastNotification from './presentation/components/ToastNotification.vue'
import AlertCriticalModal from './presentation/components/AlertCriticalModal.vue'
import { applyTheme, getStoredTheme } from './presentation/theme'
import { useAlertMonitor } from './presentation/composables/useAlertMonitor'
import { bienvenidaActiva, estaAutenticado } from './business/session'

const route = useRoute()
const router = useRouter()
const isSidebarOpen = ref(false)

const {
  totales,
  aviso,
  modalAbierto,
  iniciarMonitor,
  detenerMonitor,
  cerrarModal,
  limpiarAviso
} = useAlertMonitor()

const toggleMenu = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const verAlertas = () => {
  cerrarModal()
  router.push({ name: 'alertas' })
}

// El monitor arranca al entrar con sesión y se detiene al salir.
watch(
  () => route.fullPath,
  () => {
    if (estaAutenticado()) iniciarMonitor()
    else detenerMonitor()

    if (route.name === 'alertas' && modalAbierto.value) cerrarModal()
  },
  { immediate: true }
)

// Si el aviso llega cuando el usuario ya está viendo las alertas,
// no tiene sentido interrumpirlo con el modal.
watch(modalAbierto, (abierto) => {
  if (abierto && route.name === 'alertas') cerrarModal()
})

onMounted(() => {
  applyTheme(getStoredTheme())
})

onBeforeUnmount(detenerMonitor)
</script>

<template>
  <template v-if="route.name !== 'login'">
    <div
      id="sidebar-backdrop"
      class="sidebar-backdrop d-lg-none"
      :class="{ show: isSidebarOpen }"
      @click="toggleMenu"
    ></div>
    <Sidebar :class="{ show: isSidebarOpen }" />

    <main id="main-content">
      <Topbar @toggle-sidebar="toggleMenu" />
      <div class="container-fluid px-0">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </template>

  <template v-else>
    <router-view />
  </template>

  <ToastNotification
    v-if="!bienvenidaActiva"
    :message="aviso"
    tone="warning"
    @close="limpiarAviso"
  />

  <AlertCriticalModal
    v-if="modalAbierto && !bienvenidaActiva"
    :total-vencidos="totales.vencidos"
    @cerrar="cerrarModal"
    @ver="verAlertas"
  />
</template>
