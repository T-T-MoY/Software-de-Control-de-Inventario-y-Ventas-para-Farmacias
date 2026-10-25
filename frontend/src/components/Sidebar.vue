<script setup>
import { computed } from 'vue'

const isAdmin = computed(() => localStorage.getItem('rolUsuario') === 'Administrador')
const modules = [
  'Medicamentos',
  'Lotes',
  'Proveedores',
  'Ventas',
  'Clientes',
  'Alertas',
  'Reportes',
  'Historial',
  'Configuración'
]
</script>

<template>
  <aside id="sidebar" class="floating-sidebar d-flex flex-column p-3">
    <router-link to="/" class="sidebar-brand d-flex align-items-center text-decoration-none mb-4 mt-2 flex-shrink-0">
      <div class="brand-icon d-flex justify-content-center align-items-center shadow-sm">
        <i class="fas fa-capsules text-white fs-5"></i>
      </div>
      <span class="brand-text ms-3 fs-6 fw-bold text-white">FARMACIA</span>
    </router-link>

    <hr class="sidebar-divider mb-3 flex-shrink-0">

    <div class="menu-scroll-container flex-grow-1 pe-1">
      <div class="sidebar-section-label">GENERAL</div>
      <ul class="nav nav-pills flex-column gap-1 mb-4">
        <li class="nav-item">
          <router-link to="/" class="nav-link d-flex align-items-center text-white">
            <i class="fas fa-chart-pie me-3"></i>
            <span>Panel principal</span>
          </router-link>
        </li>
        <li v-if="isAdmin" class="nav-item">
          <router-link to="/usuarios" class="nav-link d-flex align-items-center text-white">
            <i class="fas fa-users me-3"></i>
            <span>Usuarios</span>
          </router-link>
        </li>
      </ul>

      <div class="sidebar-section-label">MÓDULOS DEL SISTEMA</div>
      <ul class="nav flex-column gap-1">
        <li v-for="module in modules" :key="module" class="nav-item">
          <span class="nav-link d-flex align-items-center text-white-50 module-pending" :title="`${module}: en desarrollo`">
            <i class="fas fa-circle-dot me-3"></i>
            <span class="flex-grow-1">{{ module }}</span>
            <span class="pending-dot" aria-label="En desarrollo"></span>
          </span>
        </li>
      </ul>
    </div>

    <div class="sidebar-footer mt-3 pt-3">
      <small class="text-white-50">Plantilla de trabajo grupal</small>
    </div>
  </aside>
</template>

<style scoped>
.brand-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #10b981, #047857);
}

.sidebar-section-label {
  color: #94a3b8;
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 0 0.75rem 0.55rem;
}

.floating-sidebar .nav-link {
  font-size: 0.92rem;
  padding: 0.65rem 0.75rem;
}

.floating-sidebar .nav-link i {
  width: 20px;
  text-align: center;
}

.module-pending {
  cursor: default !important;
  font-size: 0.88rem !important;
}

.module-pending:hover {
  background: transparent !important;
  transform: none !important;
}

.pending-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fbbf24;
}

.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
