<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MODULOS, modulosVisibles } from '../../config/distribution'
import {
  consumirBienvenida,
  finalizarBienvenida,
  obtenerSesion
} from '../../business/session'

const sesion = obtenerSesion()
const showWelcome = ref(false)
let welcomeTimeout
let welcomeIsActive = false

const firstName = computed(() => sesion.nombrePila || 'Usuario')
const fullName = computed(() => sesion.nombre || firstName.value)
const role = computed(() => sesion.rol || 'Usuario')
const isAdmin = computed(() => sesion.rol === 'Administrador')
const puedeProcesarVentas = computed(() => ['Administrador', 'Ventas'].includes(sesion.rol))

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const modules = computed(() => modulosVisibles(sesion.rol))

onMounted(() => {
  if (!consumirBienvenida()) return

  welcomeIsActive = true
  showWelcome.value = true
  welcomeTimeout = window.setTimeout(() => {
    showWelcome.value = false
  }, 2800)
})

const handleWelcomeAfterLeave = () => {
  welcomeIsActive = false
  finalizarBienvenida()
}

onBeforeUnmount(() => {
  window.clearTimeout(welcomeTimeout)
  if (welcomeIsActive) finalizarBienvenida()
})

const stats = computed(() => [
  {
    label: 'Sesión activa',
    value: firstName.value,
    hint: fullName.value,
    icon: 'fa-user-check',
    tone: 'blue'
  },
  {
    label: 'Rol asignado',
    value: role.value,
    hint: 'Permisos aplicados',
    icon: 'fa-shield-halved',
    tone: 'lavender'
  },
  {
    label: 'Módulos disponibles',
    value: String(modules.value.length),
    hint: 'Accesos habilitados para tu rol',
    icon: 'fa-table-cells-large',
    tone: 'blue'
  },
  {
    label: 'Módulos implementados',
    value: String(MODULOS.length),
    hint: 'Inventario, ventas y administración',
    icon: 'fa-circle-check',
    tone: 'lavender'
  }
])
</script>

<template>
  <section class="px-1">
    <Transition name="login-welcome" @after-leave="handleWelcomeAfterLeave">
      <div
        v-if="showWelcome"
        class="login-welcome"
        role="status"
        aria-live="polite"
      >
        <div class="welcome-particles" aria-hidden="true">
          <span v-for="particle in 8" :key="particle"></span>
        </div>
        <div class="login-welcome-content">
          <div class="login-welcome-logo" aria-hidden="true">
            <svg class="login-welcome-ring" viewBox="0 0 220 220">
              <circle class="login-welcome-ring-track" cx="110" cy="110" r="96" />
              <circle class="login-welcome-ring-energy" cx="110" cy="110" r="96" />
            </svg>
            <span class="login-welcome-mark">
              <i class="fas fa-mortar-pestle"></i>
            </span>
          </div>
          <span class="login-welcome-eyebrow">FARMACIA · INVENTARIO Y VENTAS</span>
          <h1>¡Bienvenido, <span>{{ firstName }}</span>!</h1>
          <p>Nos alegra tenerte de vuelta.</p>
        </div>
      </div>
    </Transition>

    <div class="welcome-panel mb-4">
      <div class="welcome-glow" aria-hidden="true"></div>
      <div class="relative grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <span class="eyebrow eyebrow-light">{{ greeting }}</span>
          <h2 class="welcome-title">Hola, {{ firstName }}</h2>
          <p class="welcome-text mb-0">
            Gestiona el catálogo, inventario y ventas de la farmacia desde un solo lugar.
            Las opciones disponibles dependen de los permisos de tu sesión.
          </p>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <router-link
              to="/medicamentos"
              class="dashboard-action inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-[#fff7e3] px-4 py-2.5 text-sm font-bold text-[#05102d] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <i class="fas fa-pills" aria-hidden="true"></i>Ver catálogo
            </router-link>
            <router-link
              v-if="isAdmin"
              to="/usuarios"
              class="dashboard-action inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-[#fff7e3] px-4 py-2.5 text-sm font-bold text-[#05102d] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <i class="fas fa-users" aria-hidden="true"></i>Gestionar usuarios
            </router-link>
            <router-link
              v-if="puedeProcesarVentas"
              to="/ventas"
              class="dashboard-action inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-[#fff7e3] px-4 py-2.5 text-sm font-bold text-[#05102d] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <i class="fas fa-cash-register" aria-hidden="true"></i>Ir a ventas
            </router-link>
            <span class="welcome-chip">
              <i class="fas fa-shield-halved" aria-hidden="true"></i>
              Sesión protegida
            </span>
          </div>
        </div>
        <div class="hidden lg:block">
          <div class="welcome-emblem" aria-hidden="true">
            <i class="fas fa-mortar-pestle"></i>
            <span>Control total</span>
          </div>
        </div>
      </div>
    </div>

    <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label">
        <article class="stat-card h-full">
          <span class="stat-icon" :class="`is-${stat.tone}`">
            <i class="fas" :class="stat.icon" aria-hidden="true"></i>
          </span>
          <div class="min-w-0">
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-value truncate" :title="stat.value">{{ stat.value }}</div>
            <div class="stat-hint truncate" :title="stat.hint">{{ stat.hint }}</div>
          </div>
        </article>
      </div>
    </div>

    <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <span class="eyebrow">Áreas del sistema</span>
        <h3 class="mb-1 text-lg font-bold">Módulos del sistema</h3>
        <p class="mb-0 text-sm text-[var(--text-muted)]">Accede directamente a las áreas implementadas y habilitadas para tu rol.</p>
      </div>
      <span class="badge-soft badge-soft-lavender">
        <span class="status-dot"></span>
        {{ modules.length }} módulos disponibles
      </span>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      <div v-for="(module, index) in modules" :key="module.name">
        <router-link
          :to="module.to"
          class="module-card block h-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <div class="flex h-full items-center gap-3 p-4">
            <span class="module-icon" :class="index % 2 === 0 ? 'is-blue' : 'is-lavender'">
              <i class="fas" :class="module.icon" aria-hidden="true"></i>
            </span>
            <div class="min-w-0 flex-1">
              <div class="truncate font-semibold" :title="module.name">{{ module.name }}</div>
              <small class="text-[var(--text-muted)]">Abrir módulo</small>
            </div>
            <i class="fas fa-arrow-right module-arrow" aria-hidden="true"></i>
          </div>
        </router-link>
      </div>
    </div>

    <div class="info-strip mt-4">
      <span class="info-icon"><i class="fas fa-database" aria-hidden="true"></i></span>
      <div class="min-w-0">
        <div class="font-semibold">Base de datos preparada</div>
        <p class="mb-0 text-sm text-[var(--text-muted)]">
          El esquema de PostgreSQL está en <code>database/</code> y sirve como referencia
          para implementar los módulos.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login-welcome {
  position: fixed;
  z-index: 2000;
  inset: 0;
  display: grid;
  overflow: hidden;
  place-items: center;
  background:
    radial-gradient(ellipse at 50% 42%, var(--accent-soft), transparent 42%),
    linear-gradient(145deg, var(--bg-body), var(--bg-card));
  color: var(--text-main);
}

.login-welcome-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  text-align: center;
}

.login-welcome-logo {
  position: relative;
  display: grid;
  width: clamp(11rem, 26vw, 15rem);
  aspect-ratio: 1;
  margin-bottom: clamp(1.75rem, 5vh, 3rem);
  place-items: center;
}

.login-welcome-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  animation: welcome-rotate 8s linear infinite;
}

.login-welcome-ring-track,
.login-welcome-ring-energy {
  fill: none;
  stroke-width: 2;
}

.login-welcome-ring-track {
  stroke: var(--border-strong);
}

.login-welcome-ring-energy {
  stroke: var(--accent);
  stroke-dasharray: 190 420;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: center;
  animation: welcome-energy 2.4s ease-in-out infinite;
}

.login-welcome-mark {
  position: relative;
  display: grid;
  width: 58%;
  height: 58%;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--primary-strong), var(--primary));
  box-shadow: 0 0 70px var(--ring);
  color: var(--cream);
  font-size: clamp(2.5rem, 8vw, 4rem);
  animation: welcome-pulse 2s ease-in-out infinite;
}

.login-welcome-mark::after {
  position: absolute;
  inset: -12px;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  content: "";
  animation: welcome-wave 2s ease-out infinite;
}

.login-welcome-eyebrow {
  color: var(--text-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.login-welcome h1 {
  margin: 1rem 0 0.55rem;
  color: var(--text-main);
  font-size: clamp(2.3rem, 7vw, 5rem);
  font-weight: 800;
  letter-spacing: -0.045em;
}

.login-welcome h1 span {
  color: var(--primary);
}

.login-welcome-content > p {
  margin: 0;
  color: var(--text-muted);
  font-size: clamp(1rem, 2vw, 1.25rem);
}

.welcome-particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.welcome-particles span {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 14px var(--accent);
  opacity: 0;
  animation: welcome-particle 3.2s ease-in-out infinite;
}

.welcome-particles span:nth-child(1) { top: 20%; left: 18%; animation-delay: 0s; }
.welcome-particles span:nth-child(2) { top: 32%; left: 78%; animation-delay: 0.4s; }
.welcome-particles span:nth-child(3) { top: 72%; left: 15%; animation-delay: 0.8s; }
.welcome-particles span:nth-child(4) { top: 80%; left: 70%; animation-delay: 1.2s; }
.welcome-particles span:nth-child(5) { top: 14%; left: 58%; animation-delay: 1.6s; }
.welcome-particles span:nth-child(6) { top: 58%; left: 88%; animation-delay: 2s; }
.welcome-particles span:nth-child(7) { top: 84%; left: 42%; animation-delay: 2.4s; }
.welcome-particles span:nth-child(8) { top: 48%; left: 8%; animation-delay: 2.8s; }

.login-welcome-enter-active,
.login-welcome-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}

.login-welcome-enter-from,
.login-welcome-leave-to {
  opacity: 0;
  transform: scale(1.025);
}

@keyframes welcome-rotate {
  to { transform: rotate(360deg); }
}

@keyframes welcome-energy {
  50% { stroke-dashoffset: 170; }
}

@keyframes welcome-pulse {
  50% { transform: scale(1.1); }
}

@keyframes welcome-wave {
  0% { opacity: 0.65; transform: scale(0.9); }
  100% { opacity: 0; transform: scale(1.28); }
}

@keyframes welcome-particle {
  20% { opacity: 0.75; transform: translateY(0); }
  80% { opacity: 0; transform: translateY(-30px); }
}

@media (prefers-reduced-motion: reduce) {
  .login-welcome-ring,
  .login-welcome-ring-energy,
  .login-welcome-mark,
  .login-welcome-mark::after,
  .welcome-particles span {
    animation: none;
  }

  .login-welcome-enter-active,
  .login-welcome-leave-active {
    transition: none;
  }
}

.welcome-panel {
  position: relative;
  overflow: hidden;
  padding: 2.25rem 2.5rem;
  border-radius: 1.5rem;
  color: #fff7e3;
  background: linear-gradient(145deg, #05102d 0%, #0e2450 55%, #2a468b 100%);
  box-shadow: 0 30px 60px -34px rgba(5, 16, 45, 0.75);
}

.welcome-panel::after {
  content: "";
  position: absolute;
  right: -60px;
  bottom: -110px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  border: 1px solid rgba(184, 174, 227, 0.2);
}

.welcome-glow {
  position: absolute;
  top: -130px;
  right: 8%;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(184, 174, 227, 0.32), transparent 68%);
  pointer-events: none;
}

.welcome-title {
  margin: 0.55rem 0 0.75rem;
  font-size: clamp(1.75rem, 3vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  color: #fff7e3 !important;
}

.welcome-text {
  max-width: 64ch;
  color: rgba(255, 247, 227, 0.74);
  font-size: 0.94rem;
  line-height: 1.65;
}

.welcome-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(184, 174, 227, 0.28);
  background: rgba(255, 247, 227, 0.07);
  color: rgba(255, 247, 227, 0.82);
  font-size: 0.78rem;
  font-weight: 600;
}

.welcome-chip i {
  color: var(--blue-400);
}

.welcome-emblem {
  width: 168px;
  height: 168px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border-radius: 2rem;
  background: rgba(255, 247, 227, 0.07);
  border: 1px solid rgba(184, 174, 227, 0.24);
  backdrop-filter: blur(6px);
  transform: rotate(-3deg);
}

.welcome-emblem i {
  font-size: 2.7rem;
  color: var(--blue-400);
}

.welcome-emblem span {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 247, 227, 0.68);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1.05rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 1.1rem;
  box-shadow: var(--shadow-sm);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.85rem;
  font-size: 0.95rem;
  flex: 0 0 auto;
}

.stat-icon.is-blue {
  background: var(--accent-soft);
  color: var(--primary);
}

.stat-icon.is-lavender {
  background: var(--lavender-soft);
  color: #2a468b;
}

[data-theme="dark"] .stat-icon.is-lavender {
  color: var(--blue-400);
}

.stat-label {
  font-size: 0.63rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.stat-value {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.25;
}

.stat-hint {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.module-card {
  background: var(--bg-card);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.module-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent) !important;
  box-shadow: var(--shadow-md);
}

.module-icon {
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.9rem;
  font-size: 1rem;
  flex: 0 0 auto;
}

.module-icon.is-blue {
  background: var(--accent-soft);
  color: var(--primary);
}

.module-icon.is-lavender {
  background: var(--lavender-soft);
  color: #2a468b;
}

[data-theme="dark"] .module-icon.is-lavender {
  color: var(--blue-400);
}

.module-arrow {
  font-size: 0.72rem;
  color: var(--text-soft);
}

.info-strip {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  padding: 1rem 1.15rem;
  border: 1px solid var(--border-color);
  border-radius: 1.1rem;
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
}

.info-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.8rem;
  background: var(--lavender-soft);
  color: #2a468b;
  flex: 0 0 auto;
}

[data-theme="dark"] .info-icon {
  color: var(--blue-400);
}

@media (max-width: 767.98px) {
  .welcome-panel {
    padding: 1.75rem 1.4rem;
  }

  .welcome-text {
    font-size: 0.88rem;
  }

  .stat-card {
    padding: 0.85rem;
  }

  .stat-icon {
    width: 38px;
    height: 38px;
  }
}
</style>
