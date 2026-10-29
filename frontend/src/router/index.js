import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import UsuariosView from '../views/UsuariosView.vue'
import PerfilView from '../views/PerfilView.vue'
import { RESPONSABLES } from '../config/reparto'

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
      component: PerfilView,
      meta: { requiresAuth: true, title: 'Mi perfil' }
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: UsuariosView,
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
        title: 'Gestión de usuarios',
        responsable: RESPONSABLES.seguridad
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
  const token = localStorage.getItem('tokenSession')
  const authenticated = Boolean(token)

  if (to.meta.requiresAuth && !authenticated) return { name: 'login' }
  if (to.meta.requiresAdmin && localStorage.getItem('rolUsuario') !== 'Administrador') {
    return { name: 'dashboard' }
  }
  if (to.name === 'login' && authenticated) return { name: 'dashboard' }
  return true
})

export default router
