/**
 * Manejo centralizado de errores HTTP (capa de presentación).
 *
 * Convierte los errores de negocio (ErrorAplicacion) en respuestas JSON
 * con su estado. Cualquier error inesperado se registra y responde 500
 * sin filtrar detalles internos.
 */
const noEncontrado = (req, res) => res.status(404).json({
    error: 'Ruta no encontrada',
});

const manejarErrores = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const estado = Number(error.estado) || 500;

    if (estado >= 500) {
        console.error('Error no controlado:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }

    return res.status(estado).json({ error: error.message });
};

module.exports = { noEncontrado, manejarErrores };
