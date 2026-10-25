<script setup>
import { computed, ref } from 'vue'

const firstName = computed(() => localStorage.getItem('nombrePila') || 'Usuario')
const isAdmin = ref(localStorage.getItem('rolUsuario') === 'Administrador')
const modules = [
  { name: 'Medicamentos', icon: 'fa-pills' },
  { name: 'Lotes', icon: 'fa-boxes-stacked' },
  { name: 'Proveedores', icon: 'fa-truck' },
  { name: 'Ventas', icon: 'fa-cash-register' },
  { name: 'Clientes', icon: 'fa-address-book' },
  { name: 'Alertas', icon: 'fa-bell' },
  { name: 'Reportes', icon: 'fa-chart-column' },
  { name: 'Historial', icon: 'fa-clock-rotate-left' },
  { name: 'Configuración', icon: 'fa-sliders' }
]
</script>

<template>
  <section class="px-1">
    <div class="welcome-panel rounded-4 p-4 p-lg-5 mb-4">
      <div class="row align-items-center g-4">
        <div class="col-lg">
          <span class="badge rounded-pill text-bg-light text-success mb-3">PLANTILLA DE TRABAJO GRUPAL</span>
          <h2 class="fw-bold mb-2">Bienvenido, {{ firstName }}</h2>
          <p class="mb-0 opacity-75">
            La base del sistema de farmacia está lista. La gestión de usuarios está habilitada;
            los demás módulos se incorporarán durante el trabajo del equipo.
          </p>
        </div>
        <div class="col-lg-auto">
          <router-link v-if="isAdmin" to="/usuarios" class="btn btn-light text-success fw-semibold rounded-pill px-4">
            <i class="fas fa-users me-2"></i>Gestionar usuarios
          </router-link>
        </div>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-end mb-3">
      <div>
        <h3 class="h5 fw-bold mb-1">Módulos del sistema</h3>
        <p class="text-muted small mb-0">Espacios preparados para el desarrollo por equipos.</p>
      </div>
      <span class="badge rounded-pill text-bg-warning">En desarrollo</span>
    </div>

    <div class="row g-3">
      <div v-for="module in modules" :key="module.name" class="col-6 col-md-4 col-xl-3">
        <article class="card module-card h-100 border-0 rounded-4 shadow-sm">
          <div class="card-body d-flex align-items-center gap-3">
            <span class="module-icon rounded-3 d-flex align-items-center justify-content-center">
              <i class="fas" :class="module.icon"></i>
            </span>
            <div class="min-w-0">
              <div class="fw-semibold text-truncate">{{ module.name }}</div>
              <small class="text-muted">Próximamente</small>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div class="alert alert-info border-0 rounded-4 mt-4 mb-0" role="status">
      <i class="fas fa-circle-info me-2"></i>
      El esquema de PostgreSQL está en <code>database/</code> y sirve como referencia para implementar los módulos.
    </div>
  </section>
</template>

<style scoped>
.welcome-panel {
  color: #fff;
  background: linear-gradient(120deg, #047857, #10b981);
}

.module-card {
  background: var(--bg-card);
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.module-card:hover {
  transform: translateY(-2px);
}

.module-icon {
  width: 44px;
  height: 44px;
  color: #047857;
  background: rgba(16, 185, 129, 0.12);
  flex: 0 0 auto;
}
</style>
