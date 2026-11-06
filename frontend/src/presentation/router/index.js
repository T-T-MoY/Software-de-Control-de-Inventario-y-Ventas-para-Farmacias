import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import UsersView from '../views/UsersView.vue'
import ProfileView from '../views/ProfileView.vue'
import MedicinesView from '../views/MedicinesView.vue'
import SuppliersView from '../views/SuppliersView.vue'
import LotsView from '../views/LotsView.vue'
import AlertsView from '../views/AlertsView.vue'
import SalesView from '../views/SalesView.vue'
import CustomersView from '../views/CustomersView.vue'
import SettingsView from '../views/SettingsView.vue'
import ReportsView from '../views/ReportsView.vue'
import HistoryView from '../views/HistoryView.vue'
import { estaAutenticado, esAdministrador, obtenerSesion } from '../../business/session'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { title: 'Iniciar sesión' }
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true, title: 'Panel principal' }
    },
    {
      path: '/perfil',
      name: 'perfil',
      component: ProfileView,
      meta: { requiresAuth: true, title: 'Mi perfil' }
    },
    {
      path: '/medicamentos',
      name: 'medicamentos',
      component: MedicinesView,
      meta: {
        requiresAuth: true,
        title: 'Catálogo de medicamentos'
      }
    },
    {
      path: '/proveedores',
      name: 'proveedores',
      component: SuppliersView,
      meta: {
        requiresAuth: true,
        requiresSupplierManagement: true,
        title: 'Gestión de proveedores'
      }
    },
    {
      path: '/lotes',
      name: 'lotes',
      component: LotsView,
      meta: {
        requiresAuth: true,
        title: 'Gestión de lotes'
      }
    },
    {
      path: '/alertas',
      name: 'alertas',
      component: AlertsView,
      meta: {
        requiresAuth: true,
        title: 'Alertas de inventario'
      }
    },
    {
      path: '/ventas',
      name: 'ventas',
      component: SalesView,
      meta: {
        requiresAuth: true,
        requiresSalesAccess: true,
        title: 'Punto de venta'
      }
    },
    {
      path: '/clientes',
      name: 'clientes',
      component: CustomersView,
      meta: {
        requiresAuth: true,
        requiresSalesAccess: true,
        title: 'Gestión de clientes'
      }
    },
    {
      path: '/configuracion',
      name: 'configuracion',
      component: SettingsView,
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
        title: 'Configuración'
      }
    },
    {
      path: '/reportes',
      name: 'reportes',
      component: ReportsView,
      meta: { requiresAuth: true, requiresAdmin: true, title: 'Reportes' }
    },
    {
      path: '/historial',
      name: 'historial',
      component: HistoryView,
      meta: { requiresAuth: true, requiresAdmin: true, title: 'Historial' }
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: UsersView,
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
        title: 'Gestión de usuarios'
      }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || 'Farmacia'} | Control de Inventario y Ventas`
  const authenticated = estaAutenticado()

  if (to.meta.requiresAuth && !authenticated) return { name: 'login' }
  if (to.meta.requiresAdmin && !esAdministrador()) {
    return { name: 'dashboard' }
  }
  if (to.name === 'login' && authenticated) return { name: 'dashboard' }
  if (to.meta.requiresSupplierManagement && !['Administrador', 'Encargado de inventario']
    .includes(obtenerSesion().rol)) {
    return { name: 'dashboard' }
  }
  if (to.meta.requiresSalesAccess && !['Administrador', 'Ventas']
    .includes(obtenerSesion().rol)) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
