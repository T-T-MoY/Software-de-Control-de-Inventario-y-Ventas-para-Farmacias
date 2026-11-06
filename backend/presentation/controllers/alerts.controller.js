
/**
 * Controlador de alertas de inventario.
 *
 * Recibe las solicitudes HTTP y delega las consultas
 * en la capa de negocio.
 */

const inventarioServicio = require(
    '../../business/services/inventory.service'
);

/**
 * GET /api/alertas/resumen
 *
 * Devuelve el resumen general de alertas.
 */
const obtenerResumen = async (req, res, next) => {
    try {
        const resumen = await inventarioServicio.obtenerResumenAlertas();

        return res.json(resumen);
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /api/alertas/contadores
 *
 * Devuelve solo los totales de alertas. Se usa para el badge
 * del menú, que consulta el resumen periódicamente.
 */
const obtenerContadores = async (req, res, next) => {
    try {
        const contadores =
            await inventarioServicio.obtenerContadoresAlertas();

        return res.json(contadores);
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /api/alertas/vencimientos/proximos
 *
 * Devuelve los lotes próximos a vencer.
 */
const obtenerLotesPorVencer = async (req, res, next) => {
    try {
        const lotes = await inventarioServicio.listarLotesPorVencer();

        return res.json({
            total: lotes.length,
            lotes,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /api/alertas/vencimientos/vencidos
 *
 * Devuelve los lotes vencidos pendientes de baja.
 */
const obtenerLotesVencidos = async (req, res, next) => {
    try {
        const lotes = await inventarioServicio.listarLotesVencidos();

        return res.json({
            total: lotes.length,
            lotes,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /api/alertas/reorden
 *
 * Devuelve los medicamentos que necesitan reposición.
 */
const obtenerMedicamentosPorReponer = async (req, res, next) => {
    try {
        const medicamentos =
            await inventarioServicio.listarMedicamentosPorReponer();

        return res.json({
            total: medicamentos.length,
            medicamentos,
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    obtenerResumen,
    obtenerContadores,
    obtenerLotesPorVencer,
    obtenerLotesVencidos,
    obtenerMedicamentosPorReponer,
};
