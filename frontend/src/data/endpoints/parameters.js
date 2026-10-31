import { apiRequest } from '../api'

/** Parámetros generales: margen de alerta, stock de seguridad y farmacia. */
export const obtenerParametros = () => apiRequest('/api/parametros')
