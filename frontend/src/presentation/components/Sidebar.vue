<script setup>
import { computed } from 'vue'
import { modulosVisibles, RESPONSABLES } from '../../config/distribution'
import { esAdministrador, obtenerSesion } from '../../business/session'
import { useAlertMonitor } from '../composables/useAlertMonitor'

const isAdmin = computed(() => esAdministrador())

const { totales } = useAlertMonitor()
const totalAlertas = computed(() => totales.value.total)
const hayLotesVencidos = computed(() => totales.value.vencidos > 0)

// El sidebar muestra solo los módulos del rol de la sesión.
const modules = computed(() =>
  modulosVisibles(obtenerSesion().rol).map(module => ({
    ...module,
    to: module.to || (
      module.name === 'Reportes' ? '/reportes' :
      module.name === 'Historial' ? '/historial' : null
    )
  }))
)
</script>

<template>
  <aside id="sidebar" class="floating-sidebar d-flex flex-column p-3">
    <router-link
      to="/"
      class="sidebar-brand d-flex align-items-center text-decoration-none mb-4 mt-2 flex-shrink-0"
      aria-label="Ir al panel principal"
    >
      <div class="brand-icon d-flex justify-content-center align-items-center shadow-sm">
        <i class="fas fa-capsules text-white fs-5"></i>
      </div>
      <div class="ms-3 d-flex flex-column">
        <span class="brand-text fs-6 fw-bold">FARMACIA</span>
        <span class="brand-subtext">Inventario &amp; Ventas</span>
      </div>
    </router-link>

    <hr class="sidebar-divider mb-3 flex-shrink-0">

    <div class="menu-scroll-container flex-grow-1 pe-1">
      <div class="sidebar-section-label">GENERAL</div>
      <ul class="nav nav-pills flex-column gap-1 mb-4">
        <li class="nav-item">
          <router-link to="/" class="nav-link d-flex align-items-center">
            <i class="fas fa-chart-pie me-3"></i>
            <span>Panel principal</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/medicamentos" class="nav-link d-flex align-items-center">
            <i class="fas fa-pills me-3"></i>
            <span class="flex-grow-1">
              Medicamentos
              <small class="module-owner">({{ RESPONSABLES.catalogo }})</small>
            </span>
          </router-link>
        </li>
        <li v-if="isAdmin" class="nav-item">
          <router-link to="/usuarios" class="nav-link d-flex align-items-center">
            <i class="fas fa-users me-3"></i>
            <span class="flex-grow-1">
              Usuarios
              <small class="module-owner">({{ RESPONSABLES.seguridad }})</small>
            </span>
          </router-link>
        </li>
      </ul>

      <div class="sidebar-section-label">MÓDULOS DEL SISTEMA</div>
      <ul class="nav flex-column gap-1">
        <template v-for="module in modules" :key="module.name">
          <li class="nav-item">
            <router-link
              v-if="module.to"
              :to="module.to"
              class="nav-link d-flex align-items-center"
            >
              <i class="fas me-3" :class="module.icon"></i>

              <span class="flex-grow-1">
                {{ module.name }}
                <small class="module-owner">
                  ({{ module.responsable }})
                </small>
              </span>

              <span
                v-if="module.name === 'Alertas' && totalAlertas > 0"
                class="alert-badge"
                :class="{ 'is-danger': hayLotesVencidos }"
                :title="`${totalAlertas} alertas de inventario`"
                :aria-label="`${totalAlertas} alertas de inventario`"
              >
                {{ totalAlertas > 99 ? '99+' : totalAlertas }}
              </span>
            </router-link>

            <span
              v-else
              class="nav-link d-flex align-items-center module-pending"
              :title="`${module.name}: en desarrollo (${module.responsable})`"
            >
              <i class="fas me-3" :class="module.icon"></i>

              <span class="flex-grow-1">
                {{ module.name }}
                <small class="module-owner">
                  ({{ module.responsable }})
                </small>
              </span>

              <span class="pending-dot"></span>
            </span>
          </li>
        </template>
      </ul>
    </div>

    <div class="sidebar-footer mt-3 pt-3 d-flex align-items-center justify-content-end">
      <span class="version-chip">v1.0</span>
    </div>
  </aside>
</template>

<style scoped>
.brand-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: linear-gradient(135deg, #3d6ac1, #b8aee3);
  flex: 0 0 auto;
}

.floating-sidebar .nav-link {
  font-size: 0.92rem;
  padding: 0.68rem 0.8rem;
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
  color: rgba(255, 247, 227, 0.55) !important;
}

.module-owner {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 247, 227, 0.5);
}

.alert-badge {
  flex: 0 0 auto;
  min-width: 20px;
  height: 20px;
  margin-left: 0.4rem;
  padding: 0 0.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #d97706;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 0 0 2px rgba(255, 247, 227, 0.14);
}

.alert-badge.is-danger {
  background: #dc2626;
}

.pending-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #b8aee3;
  box-shadow: 0 0 0 3px rgba(184, 174, 227, 0.16);
}

.version-chip {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  color: rgba(255, 247, 227, 0.7);
  border: 1px solid rgba(184, 174, 227, 0.28);
}
</style>
