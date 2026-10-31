// Reparto del equipo según la planificación por sprint del readme.
// Quitar este archivo y sus referencias en la versión final.

export const RESPONSABLES = {
  seguridad: 'Moisés Pérez',
  catalogo: 'Víctor Rojas',
  inventario: 'Bryan Coyo',
  ventas: 'Rodrigo Marca',
  reportes: 'Víctor Zegarrundo'
}

export const MODULOS = [
  { name: 'Medicamentos', icon: 'fa-pills', responsable: RESPONSABLES.catalogo },
  { name: 'Lotes', icon: 'fa-boxes-stacked', responsable: RESPONSABLES.inventario },
  { name: 'Proveedores', icon: 'fa-truck', responsable: RESPONSABLES.inventario },
  { name: 'Ventas', icon: 'fa-cash-register', responsable: RESPONSABLES.ventas },
  { name: 'Clientes', icon: 'fa-address-book', responsable: RESPONSABLES.ventas },
  { name: 'Alertas', icon: 'fa-bell', responsable: RESPONSABLES.inventario },
  { name: 'Reportes', icon: 'fa-chart-column', responsable: RESPONSABLES.reportes },
  { name: 'Historial', icon: 'fa-clock-rotate-left', responsable: RESPONSABLES.reportes },
  { name: 'Configuración', icon: 'fa-sliders', responsable: RESPONSABLES.seguridad }
]
