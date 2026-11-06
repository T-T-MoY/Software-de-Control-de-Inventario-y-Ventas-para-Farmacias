/**
 * Casos de uso de reportes e historial (RF6).
 *
 * Valida filtros, pide los datos a los repositorios, calcula totales y
 * genera las exportaciones. No conoce Express ni SQL.
 */
const reportesRepositorio = require('../../data/repositories/reports.repository');
const historialRepositorio = require('../../data/repositories/history.repository');
const perfilServicio = require('./profile.service');
const exportador = require('./report-export.service');
const {
    margenAlertaDias,
    zonaHoraria,
    farmacia,
} = require('../../config/parameters');
const {
    TIPOS_OPERACION,
    ETIQUETAS_OPERACION,
    obtenerDefinicion,
    normalizarFiltrosReporte,
    normalizarFiltrosHistorial,
    validarFormato,
    calcularTotales,
    describirOperacion,
} = require('../rules/reports.rules');

const consultarFilas = (tipo, { fechaInicio, fechaFin }) => {
    switch (tipo) {
    case 'ventas':
        return reportesRepositorio.listarVentas(fechaInicio, fechaFin, zonaHoraria);
    case 'inventario':
        return reportesRepositorio.listarInventario();
    case 'lotes-por-vencer':
        return reportesRepositorio.listarLotesPorVencer(fechaInicio, fechaFin, margenAlertaDias);
    default:
        return reportesRepositorio.listarLotesVencidos(fechaInicio, fechaFin);
    }
};

/** Reporte completo listo para mostrar en pantalla o exportar. */
const generarReporte = async (tipo, query) => {
    const definicion = obtenerDefinicion(tipo);
    const filtros = normalizarFiltrosReporte(definicion, query);
    const filas = await consultarFilas(definicion.clave, filtros);

    return {
        definicion,
        tipo: definicion.clave,
        titulo: definicion.titulo,
        filtros,
        columnas: definicion.columnas,
        filas,
        totales: calcularTotales(definicion, filas),
        total_filas: filas.length,
        generado_en: new Date().toISOString(),
    };
};

/** Respuesta JSON de GET /api/reportes/:tipo (sin la definición interna). */
const obtenerReporte = async (tipo, query) => {
    const { definicion, ...reporte } = await generarReporte(tipo, query);
    return reporte;
};

const nombreArchivo = (reporte, extension) => {
    const { fechaInicio, fechaFin } = reporte.filtros;
    const sufijo = fechaInicio && fechaFin
        ? `${fechaInicio}_a_${fechaFin}`
        : exportador.fechaLocalISO(reporte.generado_en, zonaHoraria);

    return `reporte-${reporte.tipo}-${sufijo}.${extension}`;
};

/** Exporta un reporte a PDF o Excel. Devuelve el archivo en memoria. */
const exportarReporte = async (tipo, formato, query, idUsuario) => {
    validarFormato(formato);

    const reporte = await generarReporte(tipo, query);
    const perfil = await perfilServicio.obtenerPerfil(idUsuario);
    const meta = {
        usuario: perfil.nombre_completo,
        generadoEn: reporte.generado_en,
        zonaHoraria,
        farmacia,
    };

    if (formato === 'pdf') {
        return {
            buffer: await exportador.generarPdf(reporte, meta),
            contentType: 'application/pdf',
            nombreArchivo: nombreArchivo(reporte, 'pdf'),
        };
    }

    return {
        buffer: await exportador.generarExcel(reporte, meta),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        nombreArchivo: nombreArchivo(reporte, 'xlsx'),
    };
};

/** Página del historial (solo lectura) con resumen por tipo de operación. */
const consultarHistorial = async (query) => {
    const filtros = normalizarFiltrosHistorial(query);

    const [filas, conteos] = await Promise.all([
        historialRepositorio.listarHistorial(filtros, zonaHoraria),
        historialRepositorio.contarPorTipo(filtros, zonaHoraria),
    ]);

    const resumen = Object.fromEntries(TIPOS_OPERACION.map((tipo) => [tipo, 0]));
    conteos.forEach((fila) => { resumen[fila.tipo_operacion] = fila.cantidad; });
    const total = Object.values(resumen).reduce((suma, n) => suma + n, 0);

    return {
        filtros,
        pagina: filtros.pagina,
        limite: filtros.limite,
        total,
        total_paginas: Math.max(1, Math.ceil(total / filtros.limite)),
        resumen,
        registros: filas.map((fila) => ({
            ...fila,
            etiqueta_operacion: ETIQUETAS_OPERACION[fila.tipo_operacion],
            descripcion: describirOperacion(fila),
        })),
    };
};

const listarUsuariosHistorial = () => historialRepositorio.listarUsuariosConOperaciones();

module.exports = {
    obtenerReporte,
    exportarReporte,
    consultarHistorial,
    listarUsuariosHistorial,
};
