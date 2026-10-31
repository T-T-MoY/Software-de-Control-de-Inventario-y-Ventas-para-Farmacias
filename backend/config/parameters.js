// backend/config/parameters.js
// Parámetros generales del sistema. Se leen una sola vez desde el entorno
// para que los módulos de inventario y ventas no dependan de una tabla extra.
require('./env');

const numeroEnteroNoNegativo = (valor, porDefecto) => (
    Number.isInteger(valor) && valor >= 0 ? valor : porDefecto
);
const numeroEnteroPositivo = (valor, porDefecto) => (
    Number.isInteger(valor) && valor > 0 ? valor : porDefecto
);

const margenAlertaDias = Number(process.env.MARGEN_ALERTA_DIAS);
const stockSeguridad = Number(process.env.STOCK_SEGURIDAD);
const diasReposicion = Number(process.env.DIAS_REPOSICION);
const ventanaDemandaDias = Number(process.env.VENTANA_DEMANDA_DIAS);

module.exports = {
    // Días de anticipación con los que se avisa de un lote por vencer.
    // El módulo de alertas compara: fecha_vencimiento <= CURRENT_DATE + margen.
    margenAlertaDias: numeroEnteroNoNegativo(margenAlertaDias, 30),
    // Valor por defecto para nuevos medicamentos. Cada medicamento puede
    // sobrescribirlo en su columna stock_seguridad.
    stockSeguridad: numeroEnteroNoNegativo(stockSeguridad, 0),
    diasReposicion: numeroEnteroPositivo(diasReposicion, 5),
    ventanaDemandaDias: numeroEnteroPositivo(ventanaDemandaDias, 30),
    // Datos que se imprimen en el encabezado del comprobante de venta.
    farmacia: {
        nombre: process.env.FARMACIA_NOMBRE,
        nit: process.env.FARMACIA_NIT,
        direccion: process.env.FARMACIA_DIRECCION,
        telefono: process.env.FARMACIA_TELEFONO,
    },
};
