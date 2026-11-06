const TODOS = ['Administrador', 'Encargado de inventario', 'Ventas']

// Define los módulos implementados y los roles que pueden acceder a ellos.
export const MODULOS = [
  {
    name: 'Medicamentos',
    icon: 'fa-pills',
    roles: TODOS,
    to: '/medicamentos'
  },
  {
    name: 'Usuarios',
    icon: 'fa-users',
    roles: ['Administrador'],
    to: '/usuarios'
  },
  {
    name: 'Lotes',
    icon: 'fa-boxes-stacked',
    roles: ['Administrador', 'Encargado de inventario'],
    to: '/lotes'
  },
  {
    name: 'Proveedores',
    icon: 'fa-truck',
    roles: ['Administrador', 'Encargado de inventario'],
    to: '/proveedores'
  },
  {
    name: 'Ventas',
    icon: 'fa-cash-register',
    roles: ['Administrador', 'Ventas'],
    to: '/ventas'
  },
  {
    // El rol Ventas llega a la gestión desde el botón de la pantalla de ventas.
    name: 'Clientes',
    icon: 'fa-address-book',
    roles: ['Administrador'],
    to: '/clientes'
  },
  {
    name: 'Alertas',
    icon: 'fa-bell',
    roles: TODOS,
    to: '/alertas'
  },
  {
    name: 'Reportes',
    icon: 'fa-chart-column',
    roles: ['Administrador'],
    to: '/reportes'
  },
  {
    name: 'Historial',
    icon: 'fa-clock-rotate-left',
    roles: ['Administrador'],
    to: '/historial'
  },
  {
    name: 'Configuración',
    icon: 'fa-sliders',
    roles: ['Administrador'],
    to: '/configuracion'
  }
]

// Módulos que corresponden al rol de la sesión.
export const modulosVisibles = (rol) => (
  MODULOS.filter((modulo) => modulo.roles.includes(rol))
)
