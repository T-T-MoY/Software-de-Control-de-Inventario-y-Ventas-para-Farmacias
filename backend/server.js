require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || true,
}));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        console.error('Health check failed:', error.message);
        res.status(503).json({ status: 'error', database: 'unavailable' });
    }
});

app.use('/api', authRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((error, req, res, next) => {
    console.error('Unhandled API error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    console.log(`API de farmacia disponible en el puerto ${port}`);
});
