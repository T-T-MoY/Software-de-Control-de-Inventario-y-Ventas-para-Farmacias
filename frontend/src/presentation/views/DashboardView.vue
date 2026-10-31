<script setup>
import { computed } from 'vue'
import { MODULOS } from '../../config/distribution'
import { obtenerSesion } from '../../business/session'

const sesion = obtenerSesion()

const firstName = computed(() => sesion.nombrePila || 'Usuario')
const fullName = computed(() => sesion.nombre || firstName.value)
const role = computed(() => sesion.rol || 'Usuario')
const isAdmin = computed(() => sesion.rol === 'Administrador')

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const modules = MODULOS

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
    label: 'Módulos activos',
    value: '3',
    hint: 'Panel, usuarios y perfil',
    icon: 'fa-table-cells-large',
    tone: 'blue'
  },
  {
    label: 'En desarrollo',
    value: String(modules.length),
    hint: 'Próximas entregas',
    icon: 'fa-code',
    tone: 'lavender'
  }
])
</script>

<template>
  <section class="px-1">
    <div class="welcome-panel mb-4">
      <div class="welcome-glow" aria-hidden="true"></div>
      <div class="row align-items-center g-4 position-relative">
        <div class="col-lg">
          <span class="eyebrow eyebrow-light">{{ greeting }}</span>
          <h2 class="welcome-title">Hola, {{ firstName }}</h2>
          <p class="welcome-text mb-0">
            La base del sistema de farmacia está lista. La gestión de usuarios y el perfil
            ya están habilitados; los demás módulos se incorporarán durante el trabajo del equipo.
          </p>
          <div class="d-flex flex-wrap align-items-center gap-2 mt-4">
            <router-link
              v-if="isAdmin"
              to="/usuarios"
              class="btn btn-cream rounded-pill px-4"
            >
              <i class="fas fa-users me-2"></i>Gestionar usuarios
            </router-link>
            <span class="welcome-chip">
              <i class="fas fa-shield-halved"></i>
              Sesión protegida
            </span>
          </div>
        </div>
        <div class="col-lg-auto d-none d-lg-block">
          <div class="welcome-emblem" aria-hidden="true">
            <i class="fas fa-mortar-pestle"></i>
            <span>Control total</span>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <div v-for="stat in stats" :key="stat.label" class="col-6 col-xl-3">
        <article class="stat-card h-100">
          <span class="stat-icon" :class="`is-${stat.tone}`">
            <i class="fas" :class="stat.icon"></i>
          </span>
          <div class="min-w-0">
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-value text-truncate" :title="stat.value">{{ stat.value }}</div>
            <div class="stat-hint text-truncate" :title="stat.hint">{{ stat.hint }}</div>
          </div>
        </article>
      </div>
    </div>

    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
      <div>
        <span class="eyebrow">Catálogo</span>
        <h3 class="h5 fw-bold mb-1">Módulos del sistema</h3>
        <p class="text-muted small mb-0">Espacios preparados para el desarrollo por equipos.</p>
      </div>
      <span class="badge-soft badge-soft-lavender">
        <span class="status-dot"></span>
        {{ modules.length }} en desarrollo
      </span>
    </div>

    <div class="row g-3">
      <div v-for="(module, index) in modules" :key="module.name" class="col-6 col-md-4 col-xl-3">
        <article class="card module-card h-100 border-0">
          <div class="card-body d-flex align-items-center gap-3">
            <span class="module-icon" :class="index % 2 === 0 ? 'is-blue' : 'is-lavender'">
              <i class="fas" :class="module.icon"></i>
            </span>
            <div class="min-w-0 flex-grow-1">
              <div class="fw-semibold text-truncate" :title="module.name">{{ module.name }}</div>
              <small class="text-muted">({{ module.responsable }}) · Próximamente</small>
            </div>
            <i class="fas fa-hourglass-half module-arrow" title="En desarrollo"></i>
          </div>
        </article>
      </div>
    </div>

    <div class="info-strip mt-4">
      <span class="info-icon"><i class="fas fa-database"></i></span>
      <div>
        <div class="fw-semibold">Base de datos preparada</div>
        <p class="mb-0 text-muted small">
          El esquema de PostgreSQL está en <code>database/</code> y sirve como referencia
          para implementar los módulos.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
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

.module-card .card-body {
  padding: 1rem 1.05rem;
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
