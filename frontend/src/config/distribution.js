// Reparto del equipo según la planificación por sprint del readme.
// Quitar este archivo y sus referencias en la versión final.

export const RESPONSABLES = {
  seguridad: 'Moisés Pérez',
  catalogo: 'Víctor Rojas',
  inventario: 'Bryan Coyo',
  ventas: 'Rodrigo Marca',
  reportes: 'Víctor Zegarrundo'
}

const TODOS = ['Administrador', 'Encargado de inventario', 'Ventas']

// `roles` define qué roles ven cada módulo en el sidebar.
// `to` solo existe en los módulos ya implementados; los demás se
// muestran como pendientes. El backend vuelve a comprobar los permisos.
export const MODULOS = [
  {
    name: 'Lotes',
    icon: 'fa-boxes-stacked',
    responsable: RESPONSABLES.inventario,
    roles: ['Administrador', 'Encargado de inventario'],
    to: '/lotes'
  },
  {
    name: 'Proveedores',
    icon: 'fa-truck',
    responsable: RESPONSABLES.inventario,
    roles: ['Administrador', 'Encargado de inventario'],
    to: '/proveedores'
  },
  {
    name: 'Ventas',
    icon: 'fa-cash-register',
    responsable: RESPONSABLES.ventas,
    roles: ['Administrador', 'Ventas'],
    to: '/ventas'
  },
  {
    // El rol Ventas llega a la gestión desde el botón de la pantalla de ventas.
    name: 'Clientes',
    icon: 'fa-address-book',
    responsable: RESPONSABLES.ventas,
    roles: ['Administrador'],
    to: '/clientes'
  },
  {
    name: 'Alertas',
    icon: 'fa-bell',
    responsable: RESPONSABLES.inventario,
    roles: TODOS,
    to: '/alertas'
  },
  {
    name: 'Reportes',
    icon: 'fa-chart-column',
    responsable: RESPONSABLES.reportes,
    roles: ['Administrador']
  },
  {
    name: 'Historial',
    icon: 'fa-clock-rotate-left',
    responsable: RESPONSABLES.reportes,
    roles: ['Administrador']
  },
  {
    name: 'Configuración',
    icon: 'fa-sliders',
    responsable: RESPONSABLES.seguridad,
    roles: ['Administrador'],
    to: '/configuracion'
  }
]

// Módulos que corresponden al rol de la sesión.
export const modulosVisibles = (rol) => (
  MODULOS.filter((modulo) => modulo.roles.includes(rol))
)
