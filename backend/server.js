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
const { noEncontrado, manejarErrores } = require('./presentation/middleware/errors');

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || true,
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
// Sprint 3 montará aquí /api/alertas, /api/proveedores y /api/lotes;
// cada ruta debe usar autenticación y autorizar(PERMISOS.X).

app.use(noEncontrado);
app.use(manejarErrores);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    console.log(`API de farmacia disponible en el puerto ${port}`);
});
