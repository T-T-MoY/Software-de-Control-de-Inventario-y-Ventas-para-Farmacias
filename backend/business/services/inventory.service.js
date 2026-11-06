
/**
 * Servicio de inventario y alertas.
 *
 * Integra las consultas del repositorio con las reglas
 * de negocio existentes para calcular el punto de reorden.
 */

const alertasRepositorio = require(
    '../../data/repositories/alerts.repository'
);

const {
    evaluarReorden,
} = require('../rules/inventory.rules');

const parametros = require('../../config/parameters');

/**
 * Consultar lotes próximos a vencer.
 */
const listarLotesPorVencer = async () => {
    return alertasRepositorio.listarLotesPorVencer();
};

/**
 * Consultar lotes vencidos que todavía no tienen baja.
 */
const listarLotesVencidos = async () => {
    return alertasRepositorio.listarLotesVencidos();
};

/**
 * Calcular el punto de reorden de cada medicamento.
 *
 * Utiliza:
 * - Demanda diaria de los últimos 30 días.
 * - Días de reposición.
 * - Stock de seguridad.
 * - Stock disponible actual.
 *
 * Reutiliza evaluarReorden(), existente en inventory.rules.js.
 */
const listarMedicamentosPorReponer = async () => {
    const medicamentos = await alertasRepositorio.listarDatosReorden();

    const resultados = medicamentos.map((medicamento) => {
        const stockActual = Number(medicamento.stock_actual);
        const demandaDiaria = Number(medicamento.demanda_diaria);
        const diasReposicion = Number(medicamento.dias_reposicion);
        const stockSeguridad = Number(medicamento.stock_seguridad);

        const resultado = evaluarReorden({
            stockActual,
            demandaDiaria,
            diasReposicion,
            stockSeguridad,
        });

        return {
            id_medicamento: medicamento.id_medicamento,
            codigo_barras: medicamento.codigo_barras,
            nombre_comercial: medicamento.nombre_comercial,
            concentracion: medicamento.concentracion,

            stock_actual: stockActual,
            unidades_vendidas: Number(
                medicamento.unidades_vendidas
            ),

            demanda_diaria: demandaDiaria,
            dias_reposicion: diasReposicion,
            stock_seguridad: stockSeguridad,

            punto_reorden: resultado.puntoReorden,
            requiere_reposicion: resultado.alerta,
        };
    });

    // Devolvemos únicamente medicamentos que necesitan reposición.
    return resultados.filter(
        (medicamento) => medicamento.requiere_reposicion
    );
};

/**
 * Obtener solo los contadores de alertas.
 *
 * Pensado para el badge del menú lateral, que consulta
 * cada minuto: evita devolver las listas completas.
 */
const obtenerContadoresAlertas = async () => {
    const [
        totalLotesPorVencer,
        totalLotesVencidos,
        medicamentosPorReponer,
    ] = await Promise.all([
        alertasRepositorio.contarLotesPorVencer(),
        alertasRepositorio.contarLotesVencidos(),
        listarMedicamentosPorReponer(),
    ]);

    const totalMedicamentosPorReponer = medicamentosPorReponer.length;

    return {
        margen_alerta_dias: parametros.margenAlertaDias,

        resumen: {
            total_lotes_por_vencer: totalLotesPorVencer,
            total_lotes_vencidos: totalLotesVencidos,
            total_medicamentos_por_reponer:
                totalMedicamentosPorReponer,
        },

        total:
            totalLotesPorVencer
            + totalLotesVencidos
            + totalMedicamentosPorReponer,
    };
};

/**
 * Obtener resumen general de alertas.
 */
const obtenerResumenAlertas = async () => {
    const [
        lotesPorVencer,
        lotesVencidos,
        medicamentosPorReponer,
    ] = await Promise.all([
        listarLotesPorVencer(),
        listarLotesVencidos(),
        listarMedicamentosPorReponer(),
    ]);

    return {
        margen_alerta_dias: parametros.margenAlertaDias,

        resumen: {
            total_lotes_por_vencer: lotesPorVencer.length,
            total_lotes_vencidos: lotesVencidos.length,
            total_medicamentos_por_reponer:
                medicamentosPorReponer.length,
        },

        lotes_por_vencer: lotesPorVencer,
        lotes_vencidos: lotesVencidos,
        medicamentos_por_reponer: medicamentosPorReponer,
    };
};

module.exports = {
    listarLotesPorVencer,
    listarLotesVencidos,
    listarMedicamentosPorReponer,
    obtenerContadoresAlertas,
    obtenerResumenAlertas,
};
