// backend/business/rules/reports.rules.js
// Reglas del módulo de reportes e historial (RF6).
// No conoce Express ni SQL: define qué reportes existen, sus columnas,
// cómo se validan los filtros y cómo se calculan los totales.
const {
    errorValidacion,
    errorNoEncontrado,
} = require('../errors/app-error');

const TIPOS_OPERACION = Object.freeze(['VENTA', 'RECEPCION', 'BAJA']);
const ETIQUETAS_OPERACION = Object.freeze({
    VENTA: 'Venta',
    RECEPCION: 'Recepción de lote',
    BAJA: 'Baja de lote',
});

// Tipos de columna: texto | fecha | fechahora | moneda | entero | decimal
const REPORTES = Object.freeze({
    ventas: {
        clave: 'ventas',
        titulo: 'Reporte de ventas',
        descripcionRango: 'Fecha de la venta',
        requiereRango: true,
        columnas: [
            { clave: 'comprobante', titulo: 'Comprobante', tipo: 'texto', ancho: 1.3 },
            { clave: 'fecha_hora_venta', titulo: 'Fecha y hora', tipo: 'fechahora', ancho: 1.4 },
            { clave: 'cliente', titulo: 'Cliente', tipo: 'texto', ancho: 2.2 },
            { clave: 'usuario', titulo: 'Atendido por', tipo: 'texto', ancho: 2.2 },
            { clave: 'subtotal', titulo: 'Subtotal (Bs)', tipo: 'moneda', ancho: 1.1 },
            { clave: 'descuento_porcentaje', titulo: 'Desc. (%)', tipo: 'decimal', ancho: 0.8 },
            { clave: 'descuento_monto', titulo: 'Descuento (Bs)', tipo: 'moneda', ancho: 1.1 },
            { clave: 'total', titulo: 'Total (Bs)', tipo: 'moneda', ancho: 1.1 },
        ],
        totales: ['subtotal', 'descuento_monto', 'total'],
    },
    inventario: {
        clave: 'inventario',
        titulo: 'Reporte de inventario',
        descripcionRango: null,
        requiereRango: false,
        sinRango: true,
        columnas: [
            { clave: 'codigo_barras', titulo: 'Código', tipo: 'texto', ancho: 1.4 },
            { clave: 'nombre_comercial', titulo: 'Medicamento', tipo: 'texto', ancho: 2.2 },
            { clave: 'concentracion', titulo: 'Concentración', tipo: 'texto', ancho: 1.3 },
            { clave: 'categoria', titulo: 'Categoría', tipo: 'texto', ancho: 1.6 },
            { clave: 'precio_unitario', titulo: 'Precio (Bs)', tipo: 'moneda', ancho: 1 },
            { clave: 'stock_actual', titulo: 'Stock', tipo: 'entero', ancho: 0.8 },
            { clave: 'valor_stock_costo', titulo: 'Valor a costo (Bs)', tipo: 'moneda', ancho: 1.2 },
            { clave: 'valor_stock_venta', titulo: 'Valor a venta (Bs)', tipo: 'moneda', ancho: 1.2 },
        ],
        totales: ['stock_actual', 'valor_stock_costo', 'valor_stock_venta'],
    },
    'lotes-por-vencer': {
        clave: 'lotes-por-vencer',
        titulo: 'Reporte de lotes por vencer',
        descripcionRango: 'Fecha de vencimiento',
        requiereRango: false,
        columnas: [
            { clave: 'medicamento', titulo: 'Medicamento', tipo: 'texto', ancho: 2.2 },
            { clave: 'lote_numero', titulo: 'Lote', tipo: 'texto', ancho: 1.2 },
            { clave: 'proveedor', titulo: 'Proveedor', tipo: 'texto', ancho: 2 },
            { clave: 'fecha_vencimiento', titulo: 'Vencimiento', tipo: 'fecha', ancho: 1.2 },
            { clave: 'dias_para_vencer', titulo: 'Días restantes', tipo: 'entero', ancho: 1 },
            { clave: 'cantidad_stock', titulo: 'Existencias', tipo: 'entero', ancho: 1 },
            { clave: 'valor_costo', titulo: 'Valor a costo (Bs)', tipo: 'moneda', ancho: 1.2 },
        ],
        totales: ['cantidad_stock', 'valor_costo'],
    },
    'lotes-vencidos': {
        clave: 'lotes-vencidos',
        titulo: 'Reporte de lotes vencidos',
        descripcionRango: 'Fecha de vencimiento',
        requiereRango: false,
        columnas: [
            { clave: 'medicamento', titulo: 'Medicamento', tipo: 'texto', ancho: 2.2 },
            { clave: 'lote_numero', titulo: 'Lote', tipo: 'texto', ancho: 1.2 },
            { clave: 'proveedor', titulo: 'Proveedor', tipo: 'texto', ancho: 2 },
            { clave: 'fecha_vencimiento', titulo: 'Vencimiento', tipo: 'fecha', ancho: 1.2 },
            { clave: 'dias_vencido', titulo: 'Días vencido', tipo: 'entero', ancho: 1 },
            { clave: 'cantidad_stock', titulo: 'Existencias', tipo: 'entero', ancho: 1 },
            { clave: 'valor_costo', titulo: 'Valor a costo (Bs)', tipo: 'moneda', ancho: 1.2 },
            { clave: 'estado_lote', titulo: 'Estado', tipo: 'texto', ancho: 1.4 },
        ],
        totales: ['cantidad_stock', 'valor_costo'],
    },
});

const FORMATOS_EXPORTACION = Object.freeze(['pdf', 'excel']);

const obtenerDefinicion = (tipo) => {
    const definicion = Object.prototype.hasOwnProperty.call(REPORTES, tipo)
        ? REPORTES[tipo]
        : null;

    if (!definicion) {
        throw errorNoEncontrado('El reporte solicitado no existe.');
    }

    return definicion;
};

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Acepta solo AAAA-MM-DD y que sea una fecha real (rechaza 2026-02-31).
const esFechaValida = (valor) => {
    if (typeof valor !== 'string' || !REGEX_FECHA.test(valor)) {
        return false;
    }

    const [anio, mes, dia] = valor.split('-').map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));

    return anio >= 1900
        && fecha.getUTCFullYear() === anio
        && fecha.getUTCMonth() === mes - 1
        && fecha.getUTCDate() === dia;
};

const textoONulo = (valor) => (
    typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null
);

const validarFecha = (valor, etiqueta) => {
    if (!esFechaValida(valor)) {
        throw errorValidacion(
            `${etiqueta} debe tener el formato AAAA-MM-DD y ser una fecha real.`
        );
    }
};

/**
 * Valida y normaliza el rango de fechas de un reporte.
 * - Ventas: ambas fechas son obligatorias.
 * - Lotes por vencer / vencidos: opcionales (por defecto, margen de alerta
 *   o todos los vencidos).
 * - Inventario: es una foto del stock actual y no usa fechas.
 */
const normalizarFiltrosReporte = (definicion, query = {}) => {
    if (definicion.sinRango) {
        return { fechaInicio: null, fechaFin: null };
    }

    const fechaInicio = textoONulo(query.fechaInicio);
    const fechaFin = textoONulo(query.fechaFin);

    if (definicion.requiereRango && (!fechaInicio || !fechaFin)) {
        throw errorValidacion('Debe proporcionar ambas fechas.');
    }

    if (fechaInicio) validarFecha(fechaInicio, 'La fecha inicial');
    if (fechaFin) validarFecha(fechaFin, 'La fecha final');

    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
        throw errorValidacion(
            'La fecha inicial no puede ser posterior a la fecha final.'
        );
    }

    return { fechaInicio, fechaFin };
};

const enteroPositivo = (valor, etiqueta) => {
    if (!/^\d+$/.test(String(valor)) || Number(valor) < 1) {
        throw errorValidacion(`${etiqueta} debe ser un entero positivo.`);
    }

    return Number(valor);
};

/** Valida los filtros y la paginación del historial de operaciones. */
const normalizarFiltrosHistorial = (query = {}) => {
    const fechaInicio = textoONulo(query.fechaInicio);
    const fechaFin = textoONulo(query.fechaFin);
    const tipo = textoONulo(query.tipo);
    const idUsuario = textoONulo(query.idUsuario);
    const pagina = textoONulo(query.pagina);
    const limite = textoONulo(query.limite);

    if (fechaInicio) validarFecha(fechaInicio, 'La fecha inicial');
    if (fechaFin) validarFecha(fechaFin, 'La fecha final');

    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
        throw errorValidacion(
            'La fecha inicial no puede ser posterior a la fecha final.'
        );
    }

    if (tipo && !TIPOS_OPERACION.includes(tipo)) {
        throw errorValidacion(
            `El tipo de operación debe ser: ${TIPOS_OPERACION.join(', ')}.`
        );
    }

    const limiteNumero = limite ? enteroPositivo(limite, 'El límite') : 25;

    if (limiteNumero > 100) {
        throw errorValidacion('El límite máximo es de 100 registros por página.');
    }

    return {
        fechaInicio,
        fechaFin,
        tipo,
        idUsuario: idUsuario ? enteroPositivo(idUsuario, 'El usuario') : null,
        pagina: pagina ? enteroPositivo(pagina, 'La página') : 1,
        limite: limiteNumero,
    };
};

const validarFormato = (formato) => {
    if (!FORMATOS_EXPORTACION.includes(formato)) {
        throw errorValidacion(
            `El formato de exportación debe ser: ${FORMATOS_EXPORTACION.join(' o ')}.`
        );
    }

    return formato;
};

/**
 * Suma las columnas indicadas. Los importes se acumulan en centavos para
 * evitar errores de punto flotante (0.1 + 0.2).
 */
const calcularTotales = (definicion, filas) => {
    const totales = {};

    definicion.totales.forEach((clave) => {
        const columna = definicion.columnas.find((c) => c.clave === clave);
        const factor = columna.tipo === 'moneda' ? 100 : 1;
        const suma = filas.reduce(
            (acumulado, fila) => acumulado + Math.round(Number(fila[clave] || 0) * factor),
            0
        );

        totales[clave] = suma / factor;
    });

    return totales;
};

/** Texto legible de cada movimiento del historial. */
const describirOperacion = (fila) => {
    if (fila.tipo_operacion === 'VENTA') {
        const referencia = fila.referencia || `#${fila.id_registro}`;
        const cliente = fila.contraparte ? ` a ${fila.contraparte}` : '';
        return `Venta ${referencia}${cliente}`;
    }

    const lote = fila.referencia ? `lote ${fila.referencia}` : `lote #${fila.id_registro}`;
    const medicamento = fila.medicamento ? ` de ${fila.medicamento}` : '';

    return fila.tipo_operacion === 'RECEPCION'
        ? `Recepción del ${lote}${medicamento}`
        : `Baja del ${lote}${medicamento}`;
};

module.exports = {
    REPORTES,
    TIPOS_OPERACION,
    ETIQUETAS_OPERACION,
    FORMATOS_EXPORTACION,
    obtenerDefinicion,
    esFechaValida,
    normalizarFiltrosReporte,
    normalizarFiltrosHistorial,
    validarFormato,
    calcularTotales,
    describirOperacion,
};
