/**
 * Validación del formulario de medicamentos (capa de presentación).
 * El backend replica estas reglas en
 * backend/presentation/validators/medicine.validator.js.
 */
export const FORMAS_FARMACEUTICAS = [
  'Tableta',
  'Cápsula',
  'Jarabe',
  'Suspensión',
  'Crema',
  'Gel',
  'Inyectable',
  'Gotas'
]

export const TIPOS_VENTA = ['Libre', 'Con receta']

const REGEX_CODIGO_BARRAS = /^[0-9A-Za-z-]{4,20}$/
const REGEX_NOMBRE_COMERCIAL = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .%()\/-]+$/
const REGEX_DCI = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .,()\/-]+$/
const REGEX_CONCENTRACION = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .,%()\/+-]+$/
const REGEX_PRECIO = /^\d{1,8}(\.\d{0,2})?$/

export const CAMPOS_MEDICAMENTO = [
  'codigo_barras',
  'nombre_comercial',
  'dci',
  'concentracion',
  'forma_farmaceutica',
  'precio_unitario',
  'tipo_venta',
  'stock_seguridad',
  'dias_reposicion',
  'id_categoria'
]

const limpiarCodigo = (valor) => (
  String(valor ?? '').replace(/[^0-9A-Za-z-]/g, '').slice(0, 20)
)

const limpiarNombreComercial = (valor) => (
  String(valor ?? '')
    .replace(/[^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .%()\/-]/g, '')
    .slice(0, 100)
)

const limpiarDci = (valor) => (
  String(valor ?? '')
    .replace(/[^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .,()\/-]/g, '')
    .slice(0, 100)
)

const limpiarConcentracion = (valor) => (
  String(valor ?? '')
    .replace(/[^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .,%()\/+-]/g, '')
    .slice(0, 40)
)

const limpiarPrecio = (valor) => {
  let texto = String(valor ?? '').replace(',', '.').replace(/[^\d.]/g, '')
  const partes = texto.split('.')
  const entero = partes.shift() || '0'
  texto = partes.length ? `${entero}.${partes.join('').slice(0, 2)}` : entero
  return texto.slice(0, 11)
}

const limpiarEntero = (valor, max = 6) => (
  String(valor ?? '').replace(/\D/g, '').slice(0, max)
)

export function limpiarCampoMedicamento(campo, valor) {
  switch (campo) {
    case 'codigo_barras':
      return limpiarCodigo(valor)
    case 'nombre_comercial':
      return limpiarNombreComercial(valor)
    case 'dci':
      return limpiarDci(valor)
    case 'concentracion':
      return limpiarConcentracion(valor)
    case 'precio_unitario':
      return limpiarPrecio(valor)
    case 'stock_seguridad':
    case 'dias_reposicion':
      return limpiarEntero(valor)
    default:
      return valor
  }
}

export function validarCampoMedicamento(campo, valor) {
  const texto = String(valor ?? '').trim()

  switch (campo) {
    case 'codigo_barras':
      if (!texto) return 'El código de barras es obligatorio.'
      if (!REGEX_CODIGO_BARRAS.test(texto)) {
        return 'El código de barras debe tener entre 4 y 20 caracteres: solo números, letras y guion.'
      }
      return ''

    case 'nombre_comercial':
      if (!texto) return 'El nombre comercial es obligatorio.'
      if (texto.length > 100) return 'El nombre comercial no puede superar 100 caracteres.'
      if (!REGEX_NOMBRE_COMERCIAL.test(texto)) {
        return 'El nombre comercial solo admite letras, números, espacios y los signos . \' - % ( ) /.'
      }
      return ''

    case 'dci':
      if (!texto) return 'El principio activo (DCI) es obligatorio.'
      if (texto.length > 100) return 'El principio activo (DCI) no puede superar 100 caracteres.'
      if (!REGEX_DCI.test(texto)) {
        return 'El principio activo (DCI) solo admite letras, números, espacios y los signos . \' , - ( ) /.'
      }
      return ''

    case 'concentracion':
      if (!texto) return 'La concentración es obligatoria.'
      if (texto.length > 40) return 'La concentración no puede superar 40 caracteres.'
      if (!REGEX_CONCENTRACION.test(texto)) {
        return 'La concentración solo admite letras, números, espacios y los signos . , % + - ( ) /.'
      }
      return ''

    case 'forma_farmaceutica':
      return FORMAS_FARMACEUTICAS.includes(valor)
        ? ''
        : 'Selecciona una forma farmacéutica válida.'

    case 'precio_unitario':
      if (!texto) return 'El precio es obligatorio.'
      if (!REGEX_PRECIO.test(texto)) {
        return 'Ingresa un precio válido, mayor o igual a 0 y con hasta 2 decimales.'
      }
      return ''

    case 'tipo_venta':
      return TIPOS_VENTA.includes(valor)
        ? ''
        : 'Selecciona un tipo de venta válido.'

    case 'stock_seguridad':
      if (!texto) return 'El stock de seguridad es obligatorio.'
      if (!/^\d+$/.test(texto)) {
        return 'El stock de seguridad debe ser un número entero mayor o igual a 0.'
      }
      return ''

    case 'dias_reposicion':
      if (!texto) return 'Los días de reposición son obligatorios.'
      if (!/^\d+$/.test(texto)) {
        return 'Los días de reposición deben ser un número entero mayor o igual a 0.'
      }
      return ''

    case 'id_categoria':
      if (!texto) return 'Selecciona una categoría.'
      if (!/^\d+$/.test(texto) || Number(texto) < 1) {
        return 'Selecciona una categoría válida.'
      }
      return ''

    default:
      return ''
  }
}

export function validarFormularioMedicamento(form) {
  return CAMPOS_MEDICAMENTO.reduce((errores, campo) => {
    errores[campo] = validarCampoMedicamento(campo, form[campo])
    return errores
  }, {})
}
