/**
 * Controlador de reportes.
 * Lee la petición, delega en el servicio y arma la respuesta HTTP.
 */
const reportesServicio = require('../../business/services/reports.service');

// GET /api/reportes/:tipo?fechaInicio=AAAA-MM-DD&fechaFin=AAAA-MM-DD
const obtenerReporte = async (req, res, next) => {
    try {
        const reporte = await reportesServicio.obtenerReporte(
            req.params.tipo,
            req.query
        );

        return res.json(reporte);
    } catch (error) {
        return next(error);
    }
};

// GET /api/reportes/:tipo/exportar?formato=pdf|excel&fechaInicio=...&fechaFin=...
const exportarReporte = async (req, res, next) => {
    try {
        const archivo = await reportesServicio.exportarReporte(
            req.params.tipo,
            typeof req.query.formato === 'string' ? req.query.formato : '',
            req.query,
            req.sessionUser.id_usuario
        );

        res.set({
            'Content-Type': archivo.contentType,
            'Content-Disposition': `attachment; filename="${archivo.nombreArchivo}"`,
            'Content-Length': archivo.buffer.length,
            'Cache-Control': 'no-store',
        });

        return res.send(archivo.buffer);
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    obtenerReporte,
    exportarReporte,
};
