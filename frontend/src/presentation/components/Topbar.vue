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
const emit = defineEmits(['toggle-sidebar', 'profile-menu-toggle'])

defineProps({
  sidebarOpen: { type: Boolean, default: false }
})

const initials = computed(() => inicialesDeNombre(userName.value))

const toggleMenu = () => {
  menuAbierto.value = !menuAbierto.value
  emit('profile-menu-toggle', menuAbierto.value)
}

const cerrarMenu = () => {
  menuAbierto.value = false
  emit('profile-menu-toggle', false)
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

</script>

<template>
  <nav
    class="relative z-20 mb-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-topbar)] px-3 py-2.5 shadow-sm backdrop-blur-xl sm:px-4 sm:py-3"
  >
    <div class="flex w-full items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <button
          type="button"
          class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-muted)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] lg:hidden"
          :aria-label="sidebarOpen ? 'Cerrar menú' : 'Abrir menú'"
          :aria-expanded="sidebarOpen"
          aria-controls="sidebar"
          @click="$emit('toggle-sidebar')"
        >
          <i class="fas" :class="sidebarOpen ? 'fa-xmark' : 'fa-bars'" aria-hidden="true"></i>
        </button>
        <div class="min-w-0">
          <div class="topbar-eyebrow hidden sm:block">Panel administrativo</div>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2 sm:gap-3">
        <a
          v-if="role === 'Administrador'"
          href="#"
          class="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-transparent text-[var(--text-muted)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          aria-label="Manual de usuario"
          title="Manual de usuario"
          @click.prevent
        >
          <i class="fas fa-circle-question" aria-hidden="true"></i>
        </a>
        <ThemeToggle />

        <div ref="menuRef" class="profile-menu">
          <button
            type="button"
            class="flex items-center gap-2 rounded-full bg-transparent px-1 py-1 text-[var(--text-main)] transition hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:gap-2.5 sm:px-2"
            aria-haspopup="menu"
            :aria-expanded="menuAbierto"
            aria-controls="profile-menu-dropdown"
            :title="menuAbierto ? 'Cerrar menú de usuario' : 'Abrir menú de usuario'"
            @click="toggleMenu"
          >
            <span class="avatar">{{ initials }}</span>
            <div class="user-chip-info hidden text-right sm:block">
              <div class="user-chip-name">{{ userName }}</div>
              <div class="user-chip-role">{{ role || 'Sesión activa' }}</div>
            </div>
            <i
              class="fas fa-chevron-down ml-1 text-[0.62rem] text-[var(--text-soft)] transition-transform duration-200"
              :class="{ 'rotate-180': menuAbierto }"
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
              <div class="profile-menu-head sm:hidden">
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
.profile-menu {
  position: relative;
  display: inline-flex;
}

.profile-menu-dropdown {
  position: absolute;
  top: calc(100% + 0.55rem);
  right: 0;
  z-index: 30;
  width: min(260px, calc(100vw - 2rem));
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
}

.profile-menu-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
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
  .menu-fade-enter-active,
  .menu-fade-leave-active {
    transition: none;
  }
}
</style>
