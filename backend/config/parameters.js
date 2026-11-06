// backend/config/parameters.js
// Parámetros generales del sistema.
//
// Los valores iniciales se leen desde el entorno. Al arrancar, el servicio
// de parámetros puede sobrescribirlos con lo guardado en la tabla
// `configuracion`, de modo que la pantalla de Configuración pueda cambiarlos
// sin reiniciar el servidor.
require('./env');

const numeroEnteroNoNegativo = (valor, porDefecto) => (
    Number.isInteger(valor) && valor >= 0 ? valor : porDefecto
);
const numeroEnteroPositivo = (valor, porDefecto) => (
    Number.isInteger(valor) && valor > 0 ? valor : porDefecto
);
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

const parametros = {
    // Días de anticipación con los que se avisa de un lote por vencer.
    // El módulo de alertas compara: fecha_vencimiento <= CURRENT_DATE + margen.
    margenAlertaDias: numeroEnteroNoNegativo(
        Number(process.env.MARGEN_ALERTA_DIAS),
        30
    ),
    // Valor por defecto para nuevos medicamentos. Cada medicamento puede
    // sobrescribirlo en su columna stock_seguridad.
    stockSeguridad: numeroEnteroNoNegativo(
        Number(process.env.STOCK_SEGURIDAD),
        0
    ),
    diasReposicion: numeroEnteroPositivo(
        Number(process.env.DIAS_REPOSICION),
        5
    ),
    ventanaDemandaDias: numeroEnteroPositivo(
        Number(process.env.VENTANA_DEMANDA_DIAS),
        30
    ),
    // Datos que se imprimen en el encabezado del comprobante de venta.
    farmacia: {
        nombre: texto(process.env.FARMACIA_NOMBRE),
        nit: texto(process.env.FARMACIA_NIT),
        direccion: texto(process.env.FARMACIA_DIRECCION),
        telefono: texto(process.env.FARMACIA_TELEFONO),
    },
};

/**
 * Aplica valores ya normalizados sobre el objeto vivo.
 *
 * Los módulos leen las propiedades en el momento de usarlas, así que los
 * cambios se reflejan de inmediato en alertas, ventas y catálogo.
 */
const aplicar = (valores = {}) => {
    if (Number.isInteger(valores.margenAlertaDias)
        && valores.margenAlertaDias >= 0) {
        parametros.margenAlertaDias = valores.margenAlertaDias;
    }

    if (Number.isInteger(valores.stockSeguridad)
        && valores.stockSeguridad >= 0) {
        parametros.stockSeguridad = valores.stockSeguridad;
    }

    if (Number.isInteger(valores.diasReposicion)
        && valores.diasReposicion >= 1) {
        parametros.diasReposicion = valores.diasReposicion;
    }

    if (Number.isInteger(valores.ventanaDemandaDias)
        && valores.ventanaDemandaDias >= 1) {
        parametros.ventanaDemandaDias = valores.ventanaDemandaDias;
    }

    const farmacia = valores.farmacia;
    if (farmacia && typeof farmacia === 'object') {
        ['nombre', 'nit', 'direccion', 'telefono'].forEach((campo) => {
            if (typeof farmacia[campo] === 'string') {
                parametros.farmacia[campo] = farmacia[campo].trim();
            }
        });
    }

    return parametros;
};

module.exports = parametros;
module.exports.aplicar = aplicar;
