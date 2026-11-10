require('./config/env');

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./data/connection');
const authRutas = require('./presentation/routes/auth.routes');
const usuariosRutas = require('./presentation/routes/users.routes');
const perfilRutas = require('./presentation/routes/profile.routes');
const parametrosRutas = require('./presentation/routes/parameters.routes');
const medicamentosRutas = require('./presentation/routes/medicines.routes');
const proveedoresRutas = require('./presentation/routes/suppliers.routes');
const lotesRutas = require('./presentation/routes/lots.routes');
const alertasRutas = require('./presentation/routes/alerts.routes');
const ventasRutas = require('./presentation/routes/sales.routes');
const clientesRutas = require('./presentation/routes/customers.routes');
const parametrosServicio = require('./business/services/parameters.service');
const reportesRutas = require('./presentation/routes/reports.routes');
const historialRutas = require('./presentation/routes/history.routes');
const { noEncontrado, manejarErrores } = require('./presentation/middleware/errors');

const app = express();
app.disable('x-powered-by');

// FRONTEND_ORIGIN admite una o varias URLs separadas por comas
// (por ejemplo, el dominio de producción y los previews de Vercel).
const origenesPermitidos = (process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);

app.use(cors({
    origin: origenesPermitidos.length > 0 ? origenesPermitidos : true,
}));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Comprobación de infraestructura: API + conexión a PostgreSQL.
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        console.error('Health check failed:', error.message);
        res.status(503).json({ status: 'error', database: 'unavailable' });
    }
});

// Capa de presentación: rutas HTTP.
app.use('/api', authRutas);
app.use('/api/usuarios', usuariosRutas);
app.use('/api/perfil', perfilRutas);
app.use('/api/parametros', parametrosRutas);
app.use('/api/medicamentos', medicamentosRutas);
app.use('/api/proveedores', proveedoresRutas);
app.use('/api/lotes', lotesRutas);
app.use('/api/alertas', alertasRutas);
app.use('/api/ventas', ventasRutas);
app.use('/api/clientes', clientesRutas);
app.use('/api/reportes', reportesRutas);
app.use('/api/historial', historialRutas);

app.use(noEncontrado);
app.use(manejarErrores);

const port = Number(process.env.PORT || 3000);

const iniciar = async () => {
    // Los parámetros guardados desde Configuración sobrescriben los de .env.
    // Si la tabla aún no existe, se conservan los valores del entorno.
    try {
        await parametrosServicio.cargar();
    } catch (error) {
        console.warn(
            'No se pudieron cargar los parámetros desde la base de datos;',
            'se usarán los valores de .env:',
            error.message
        );
    }

    app.listen(port, () => {
        console.log(`API de farmacia disponible en el puerto ${port}`);
    });
};

iniciar().catch((error) => {
    console.error('No se pudo iniciar la API:', error.message);
    process.exit(1);
});
