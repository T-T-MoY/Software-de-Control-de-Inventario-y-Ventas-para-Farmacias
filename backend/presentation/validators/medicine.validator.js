/**
 * Validación de entrada del catálogo de medicamentos.
 *
 * Solo comprueba forma, formato y obligatoriedad (capa de presentación).
 * Las reglas de persistencia viven en business/rules/medicines.rules.js.
 */
const {
    FORMAS_FARMACEUTICAS,
    TIPOS_VENTA,
} = require('../../business/rules/medicines.rules');

const REGEX_CODIGO_BARRAS = /^[0-9A-Za-z-]{4,20}$/;
const REGEX_NOMBRE_COMERCIAL = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .%()\/-]+$/;
const REGEX_DCI = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .,()\/-]+$/;
const REGEX_CONCENTRACION = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .,%()\/+-]+$/;
const REGEX_PRECIO = /^\d{1,8}(\.\d{1,2})?$/;

const esEnteroNoNegativo = (valor) => (
    /^\d+$/.test(String(valor ?? '').trim())
);

const validarPrecio = (valor) => {
    const texto = String(valor ?? '').trim();
    if (!texto) return 'El precio es obligatorio.';
    if (!REGEX_PRECIO.test(texto)) {
        return 'Ingresa un precio válido, mayor o igual a 0 y con hasta 2 decimales.';
    }
    return null;
};

const validarDatosMedicamento = (body) => {
    const codigo = String(body.codigo_barras ?? '').trim();
    if (!codigo) return 'El código de barras es obligatorio.';
    if (!REGEX_CODIGO_BARRAS.test(codigo)) {
        return 'El código de barras debe tener entre 4 y 20 caracteres: solo números, letras y guion.';
    }

    const nombre = String(body.nombre_comercial ?? '').trim();
    if (!nombre) return 'El nombre comercial es obligatorio.';
    if (nombre.length > 100) {
        return 'El nombre comercial no puede superar 100 caracteres.';
    }
    if (!REGEX_NOMBRE_COMERCIAL.test(nombre)) {
        return 'El nombre comercial solo admite letras, números, espacios y los signos . \' - % ( ) /.';
    }

    const dci = String(body.dci ?? '').trim();
    if (!dci) return 'El principio activo (DCI) es obligatorio.';
    if (dci.length > 100) {
        return 'El principio activo (DCI) no puede superar 100 caracteres.';
    }
    if (!REGEX_DCI.test(dci)) {
        return 'El principio activo (DCI) solo admite letras, números, espacios y los signos . \' , - ( ) /.';
    }

    const concentracion = String(body.concentracion ?? '').trim();
    if (!concentracion) return 'La concentración es obligatoria.';
    if (concentracion.length > 40) {
        return 'La concentración no puede superar 40 caracteres.';
    }
    if (!REGEX_CONCENTRACION.test(concentracion)) {
        return 'La concentración solo admite letras, números, espacios y los signos . , % + - ( ) /.';
    }

    if (!FORMAS_FARMACEUTICAS.includes(body.forma_farmaceutica)) {
        return 'Selecciona una forma farmacéutica válida.';
    }

    const errorPrecio = validarPrecio(body.precio_unitario);
    if (errorPrecio) return errorPrecio;

    if (!TIPOS_VENTA.includes(body.tipo_venta)) {
        return 'Selecciona un tipo de venta válido (Libre o Con receta).';
    }

    if (body.stock_seguridad !== undefined
        && body.stock_seguridad !== null
        && body.stock_seguridad !== ''
        && !esEnteroNoNegativo(body.stock_seguridad)) {
        return 'El stock de seguridad debe ser un número entero mayor o igual a 0.';
    }

    if (body.dias_reposicion === undefined
        || body.dias_reposicion === null
        || body.dias_reposicion === '') {
        return 'Los días de reposición son obligatorios.';
    }
    if (!esEnteroNoNegativo(body.dias_reposicion)
        || !Number.isSafeInteger(Number(body.dias_reposicion))
        || Number(body.dias_reposicion) < 1) {
        return 'Los días de reposición deben ser un número entero mayor o igual a 1.';
    }

    if (!Number.isInteger(Number(body.id_categoria)) || Number(body.id_categoria) < 1) {
        return 'Selecciona una categoría válida.';
    }

    return null;
};

const validarCambioEstado = (body) => (
    typeof body.activo === 'boolean'
        ? null
        : 'El estado debe ser activo o inactivo.'
);

module.exports = {
    validarDatosMedicamento,
    validarCambioEstado,
};
