/**
 * Monitor global de alertas de inventario.
 *
 * Consulta los contadores cada minuto y expone:
 * - El número para el badge del menú lateral.
 * - Un aviso temporal cuando el total sube durante la sesión.
 * - La señal para el modal crítico de lotes vencidos al iniciar sesión.
 *
 * Es un singleton: cualquier componente que llame a useAlertMonitor()
 * comparte el mismo estado y un único intervalo de consulta.
 */
import { computed, readonly, ref } from 'vue'
import { obtenerContadoresAlertas } from '../../data/endpoints/alerts'
import { estaAutenticado } from '../../business/session'

const INTERVALO_MS = 60000
const CLAVE_AVISO_VENCIDOS = 'alertasVencidosAvisados'

const resumen = ref({
  porVencer: 0,
  vencidos: 0,
  reponer: 0
})

const total = ref(0)
const cargado = ref(false)
const error = ref('')
const aviso = ref('')
const modalAbierto = ref(false)
const totales = computed(() => ({
  porVencer: resumen.value.porVencer,
  vencidos: resumen.value.vencidos,
  reponer: resumen.value.reponer,
  total: total.value
}))

let intervalo = null
let consultaEnCurso = false
let anteriores = null

const leerAvisoPrevio = () => {
  try {
    return sessionStorage.getItem(CLAVE_AVISO_VENCIDOS) === '1'
  } catch {
    return false
  }
}

const marcarAvisoMostrado = () => {
  try {
    sessionStorage.setItem(CLAVE_AVISO_VENCIDOS, '1')
  } catch {
    // sessionStorage puede no estar disponible; no es bloqueante.
  }
}

const limpiarAvisoPrevio = () => {
  try {
    sessionStorage.removeItem(CLAVE_AVISO_VENCIDOS)
  } catch {
    // Sin sessionStorage simplemente se vuelve a avisar.
  }
}

const plural = (cantidad, singular, pluralTexto) => (
  `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`
)

const describirAumento = (nuevos) => {
  const previos = anteriores || { porVencer: 0, vencidos: 0, reponer: 0 }
  const partes = []

  const vencidos = nuevos.vencidos - previos.vencidos
  const porVencer = nuevos.porVencer - previos.porVencer
  const reponer = nuevos.reponer - previos.reponer

  if (vencidos > 0) {
    partes.push(plural(vencidos, 'lote vencido', 'lotes vencidos'))
  }
  if (porVencer > 0) {
    partes.push(plural(porVencer, 'lote próximo a vencer', 'lotes próximos a vencer'))
  }
  if (reponer > 0) {
    partes.push(plural(reponer, 'medicamento por reponer', 'medicamentos por reponer'))
  }

  if (partes.length === 0) return ''

  return `Nuevas alertas de inventario: ${partes.join(', ')}.`
}

const aplicarContadores = (datos, { avisar = true, evaluarModal = true } = {}) => {
  const totalesApi = datos?.resumen || {}

  const nuevos = {
    porVencer: Number(totalesApi.total_lotes_por_vencer) || 0,
    vencidos: Number(totalesApi.total_lotes_vencidos) || 0,
    reponer: Number(totalesApi.total_medicamentos_por_reponer) || 0
  }

  const nuevoTotal = nuevos.porVencer + nuevos.vencidos + nuevos.reponer
  const primeraCarga = anteriores === null

  if (primeraCarga) {
    // El modal solo aparece al iniciar sesión y solo para lo urgente:
    // lotes ya vencidos con existencias pendientes de baja.
    if (evaluarModal && nuevos.vencidos > 0 && !leerAvisoPrevio()) {
      modalAbierto.value = true
    }
  } else if (avisar && nuevoTotal > total.value) {
    aviso.value = describirAumento(nuevos)
  }

  anteriores = nuevos
  resumen.value = nuevos
  total.value = nuevoTotal
  cargado.value = true
  error.value = ''
}

const consultar = async () => {
  if (!estaAutenticado() || consultaEnCurso) return

  consultaEnCurso = true

  try {
    const datos = await obtenerContadoresAlertas()
    aplicarContadores(datos)
  } catch (err) {
    error.value = err?.message || 'No se pudieron consultar las alertas.'

    if (err?.status === 401) {
      detenerMonitor()
    }
  } finally {
    consultaEnCurso = false
  }
}

const iniciarMonitor = () => {
  if (!estaAutenticado() || intervalo) return

  void consultar()
  intervalo = setInterval(consultar, INTERVALO_MS)
}

const reiniciarEstado = () => {
  resumen.value = { porVencer: 0, vencidos: 0, reponer: 0 }
  total.value = 0
  cargado.value = false
  error.value = ''
  aviso.value = ''
  modalAbierto.value = false
  anteriores = null
}

const detenerMonitor = () => {
  if (intervalo) {
    clearInterval(intervalo)
    intervalo = null
  }

  reiniciarEstado()
  limpiarAvisoPrevio()
}

/**
 * Sincroniza el badge con la respuesta completa de /alertas/resumen
 * sin disparar toasts ni el modal.
 */
const sincronizarConResumen = (datos) => {
  aplicarContadores(
    { resumen: datos?.resumen, total: datos?.total },
    { avisar: false, evaluarModal: false }
  )

  // La vista de alertas ya mostró la información al usuario.
  if (modalAbierto.value) {
    modalAbierto.value = false
    marcarAvisoMostrado()
  }
}

const cerrarModal = () => {
  modalAbierto.value = false
  marcarAvisoMostrado()
}

const limpiarAviso = () => {
  aviso.value = ''
}

export function useAlertMonitor() {
  return {
    totales,
    cargado: readonly(cargado),
    error: readonly(error),
    aviso,
    modalAbierto: readonly(modalAbierto),
    iniciarMonitor,
    detenerMonitor,
    refrescar: consultar,
    sincronizarConResumen,
    cerrarModal,
    limpiarAviso
  }
}
