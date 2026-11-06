/**
 * Caso de uso: parámetros generales del sistema.
 *
 * Los valores viven en memoria en config/parameters.js para que los
 * módulos de inventario, ventas y alertas los lean sin consultar la
 * base en cada operación. Al arrancar se hidratan desde la tabla
 * `configuracion`; al guardar desde la pantalla de Configuración se
 * actualizan la base y el objeto vivo.
 */
const parametros = require('../../config/parameters');
const parametrosRepositorio = require(
    '../../data/repositories/parameters.repository'
);

const CLAVES = Object.freeze({
    margenAlertaDias: 'margen_alerta_dias',
    stockSeguridad: 'stock_seguridad',
    diasReposicion: 'dias_reposicion',
    ventanaDemandaDias: 'ventana_demanda_dias',
    farmaciaNombre: 'farmacia_nombre',
    farmaciaNit: 'farmacia_nit',
    farmaciaDireccion: 'farmacia_direccion',
    farmaciaTelefono: 'farmacia_telefono',
});

const enteroGuardado = (valor, porDefecto) => {
    if (valor === null || valor === undefined || valor === '') {
        return porDefecto;
    }

    const numero = Number(valor);
    return Number.isInteger(numero) ? numero : porDefecto;
};

const textoGuardado = (valor, porDefecto) => (
    typeof valor === 'string' ? valor : porDefecto
);

/**
 * Instantánea de los parámetros vigentes.
 */
const obtener = () => ({
    margenAlertaDias: parametros.margenAlertaDias,
    stockSeguridad: parametros.stockSeguridad,
    diasReposicion: parametros.diasReposicion,
    ventanaDemandaDias: parametros.ventanaDemandaDias,
    farmacia: { ...parametros.farmacia },
});

/**
 * Cargar desde la base los valores guardados y aplicarlos en memoria.
 * Si la tabla no existe todavía, el llamador conserva los valores de .env.
 */
const cargar = async () => {
    const filas = await parametrosRepositorio.listar();

    const guardados = Object.fromEntries(
        filas.map(({ clave, valor }) => [clave, valor])
    );

    parametros.aplicar({
        margenAlertaDias: enteroGuardado(
            guardados[CLAVES.margenAlertaDias],
            parametros.margenAlertaDias
        ),
        stockSeguridad: enteroGuardado(
            guardados[CLAVES.stockSeguridad],
            parametros.stockSeguridad
        ),
        diasReposicion: enteroGuardado(
            guardados[CLAVES.diasReposicion],
            parametros.diasReposicion
        ),
        ventanaDemandaDias: enteroGuardado(
            guardados[CLAVES.ventanaDemandaDias],
            parametros.ventanaDemandaDias
        ),
        farmacia: {
            nombre: textoGuardado(
                guardados[CLAVES.farmaciaNombre],
                parametros.farmacia.nombre
            ),
            nit: textoGuardado(
                guardados[CLAVES.farmaciaNit],
                parametros.farmacia.nit
            ),
            direccion: textoGuardado(
                guardados[CLAVES.farmaciaDireccion],
                parametros.farmacia.direccion
            ),
            telefono: textoGuardado(
                guardados[CLAVES.farmaciaTelefono],
                parametros.farmacia.telefono
            ),
        },
    });

    return obtener();
};

/**
 * Guardar los parámetros y aplicarlos sin reiniciar el servidor.
 */
const actualizar = async (datos) => {
    await parametrosRepositorio.guardar({
        [CLAVES.margenAlertaDias]: datos.margenAlertaDias,
        [CLAVES.stockSeguridad]: datos.stockSeguridad,
        [CLAVES.diasReposicion]: datos.diasReposicion,
        [CLAVES.ventanaDemandaDias]: datos.ventanaDemandaDias,
        [CLAVES.farmaciaNombre]: datos.farmacia.nombre,
        [CLAVES.farmaciaNit]: datos.farmacia.nit,
        [CLAVES.farmaciaDireccion]: datos.farmacia.direccion,
        [CLAVES.farmaciaTelefono]: datos.farmacia.telefono,
    });

    parametros.aplicar(datos);

    return obtener();
};

module.exports = {
    obtener,
    cargar,
    actualizar,
};
