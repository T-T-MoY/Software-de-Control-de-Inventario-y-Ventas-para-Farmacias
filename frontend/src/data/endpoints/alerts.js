
import { apiRequest } from '../api'

/**
 * Consultas del módulo de alertas (RF4).
 */

// Obtener todas las alertas y su resumen.
export const obtenerResumenAlertas = () => (
  apiRequest('/api/alertas/resumen')
)

// Obtener solo los contadores (badge del menú lateral).
export const obtenerContadoresAlertas = () => (
  apiRequest('/api/alertas/contadores')
)

// Consultar lotes próximos a vencer.
export const listarLotesPorVencer = () => (
  apiRequest('/api/alertas/vencimientos/proximos')
)

// Consultar lotes vencidos.
export const listarLotesVencidos = () => (
  apiRequest('/api/alertas/vencimientos/vencidos')
)

// Consultar medicamentos que necesitan reposición.
export const listarMedicamentosPorReponer = () => (
  apiRequest('/api/alertas/reorden')
)
