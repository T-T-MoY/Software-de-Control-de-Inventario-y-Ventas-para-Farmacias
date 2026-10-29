<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThemeToggle from './ThemeToggle.vue'
import { inicialesDeNombre } from '../../business/format'
import { cerrarSesion, obtenerSesion } from '../../business/session'

const route = useRoute()
const router = useRouter()
const userName = ref('Usuario')
const role = ref('')
const menuAbierto = ref(false)
const menuRef = ref(null)

const initials = computed(() => inicialesDeNombre(userName.value))

const toggleMenu = () => {
  menuAbierto.value = !menuAbierto.value
}

const cerrarMenu = () => {
  menuAbierto.value = false
}

const handleClickOutside = (event) => {
  if (menuAbierto.value && menuRef.value && !menuRef.value.contains(event.target)) {
    cerrarMenu()
  }
}

const handleEscape = (event) => {
  if (event.key === 'Escape') {
    cerrarMenu()
  }
}

onMounted(() => {
  const sesion = obtenerSesion()
  userName.value = sesion.nombre || 'Usuario'
  role.value = sesion.rol || ''
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})

watch(() => route.fullPath, cerrarMenu)

const salir = async () => {
  cerrarMenu()
  cerrarSesion()
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
          <h1 class="h5 mb-0 fw-bold page-title">
            {{ route.meta.title }}
            <span v-if="route.meta.responsable" class="page-owner">
              ({{ route.meta.responsable }})
            </span>
          </h1>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2 gap-sm-3">
        <ThemeToggle />

        <div ref="menuRef" class="profile-menu">
          <button
            type="button"
            class="user-chip d-flex"
            aria-haspopup="menu"
            :aria-expanded="menuAbierto"
            aria-controls="profile-menu-dropdown"
            :title="menuAbierto ? 'Cerrar menú de usuario' : 'Abrir menú de usuario'"
            @click="toggleMenu"
          >
            <span class="avatar">{{ initials }}</span>
            <div class="user-chip-info text-end d-none d-sm-block">
              <div class="user-chip-name">{{ userName }}</div>
              <div class="user-chip-role">{{ role || 'Sesión activa' }}</div>
            </div>
            <i
              class="fas fa-chevron-down user-chip-caret"
              :class="{ 'is-open': menuAbierto }"
              aria-hidden="true"
            ></i>
          </button>

          <transition name="menu-fade">
            <div
              v-if="menuAbierto"
              id="profile-menu-dropdown"
              class="profile-menu-dropdown"
              role="menu"
              aria-label="Menú de usuario"
            >
              <div class="profile-menu-head d-sm-none">
                <div class="user-chip-name">{{ userName }}</div>
                <div class="user-chip-role">{{ role || 'Sesión activa' }}</div>
              </div>

              <router-link
                to="/perfil"
                class="profile-menu-item"
                role="menuitem"
                @click="cerrarMenu"
              >
                <i class="fas fa-circle-user"></i>
                <span>Mi perfil</span>
              </router-link>

              <div class="profile-menu-divider" role="separator"></div>

              <button
                type="button"
                class="profile-menu-item is-danger"
                role="menuitem"
                @click="salir"
              >
                <i class="fas fa-arrow-right-from-bracket"></i>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.page-owner {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-accent);
  white-space: nowrap;
}

.profile-menu {
  position: relative;
  display: inline-flex;
}

.user-chip {
  border: 0;
  padding-right: 0.7rem;
  background: transparent;
  font: inherit;
  text-align: inherit;
}

.user-chip:hover,
.user-chip[aria-expanded="true"] {
  background: var(--accent-soft);
}

.user-chip-caret {
  margin-left: 0.2rem;
  font-size: 0.62rem;
  color: var(--text-soft);
  transition: transform 0.2s ease;
}

.user-chip-caret.is-open {
  transform: rotate(180deg);
}

.profile-menu-dropdown {
  position: absolute;
  top: calc(100% + 0.55rem);
  right: 0;
  z-index: 1060;
  min-width: 220px;
  padding: 0.45rem;
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  background: var(--bg-card);
  box-shadow: var(--shadow-md);
}

.profile-menu-head {
  margin-bottom: 0.3rem;
  padding: 0.45rem 0.75rem 0.6rem;
  border-bottom: 1px solid var(--border-color);
}

.profile-menu-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 0;
  border-radius: 0.7rem;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: left;
  text-decoration: none;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.profile-menu-item i {
  width: 1.05rem;
  text-align: center;
  color: var(--text-accent);
}

.profile-menu-item:hover,
.profile-menu-item:focus-visible {
  background: var(--accent-soft);
  color: var(--primary);
  outline: none;
}

.profile-menu-item.is-danger {
  color: var(--danger);
}

.profile-menu-item.is-danger i {
  color: var(--danger);
}

.profile-menu-item.is-danger:hover,
.profile-menu-item.is-danger:focus-visible {
  background: var(--danger-soft);
  color: var(--danger);
}

.profile-menu-divider {
  height: 1px;
  margin: 0.3rem 0.4rem;
  background: var(--border-color);
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .user-chip-caret,
  .menu-fade-enter-active,
  .menu-fade-leave-active {
    transition: none;
  }
}
</style>
