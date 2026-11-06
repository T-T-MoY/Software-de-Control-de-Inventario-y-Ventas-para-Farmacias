/**
 * Validaciones de entrada para los parámetros generales.
 *
 * Comprueba rangos numéricos y longitudes antes de guardar. El
 * frontend replica estas reglas para dar respuesta inmediata.
 */

const REGEX_NOMBRE_FARMACIA = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9&' .(),/-]+$/;
const REGEX_TELEFONO = /^[0-9+()\s-]{7,20}$/;

const esEnteroEnRango = (valor, minimo, maximo) => (
    Number.isInteger(valor) && valor >= minimo && valor <= maximo
);

const validarDatosParametros = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return 'Los parámetros son obligatorios.';
    }

    const margen = Number(body.margenAlertaDias);
    if (!esEnteroEnRango(margen, 0, 365)) {
        return 'El margen de alerta debe ser un entero entre 0 y 365 días.';
    }

    const stockSeguridad = Number(body.stockSeguridad);
    if (!esEnteroEnRango(stockSeguridad, 0, 100000)) {
        return 'El stock de seguridad debe ser un entero entre 0 y 100000.';
    }

    const diasReposicion = Number(body.diasReposicion);
    if (!esEnteroEnRango(diasReposicion, 1, 365)) {
        return 'Los días de reposición deben ser un entero entre 1 y 365.';
    }

    const ventanaDemanda = Number(body.ventanaDemandaDias);
    if (!esEnteroEnRango(ventanaDemanda, 1, 365)) {
        return 'La ventana de demanda debe ser un entero entre 1 y 365 días.';
    }

    const farmacia = body.farmacia;
    if (!farmacia || typeof farmacia !== 'object' || Array.isArray(farmacia)) {
        return 'Los datos de la farmacia son obligatorios.';
    }

    const nombre = String(farmacia.nombre ?? '').trim();
    if (!nombre) {
        return 'El nombre de la farmacia es obligatorio.';
    }
    if (nombre.length > 120) {
        return 'El nombre de la farmacia no puede superar 120 caracteres.';
    }
    if (!REGEX_NOMBRE_FARMACIA.test(nombre)) {
        return 'El nombre de la farmacia contiene caracteres no permitidos.';
    }

    const nit = String(farmacia.nit ?? '').trim();
    if (nit.length > 30) {
        return 'El NIT no puede superar 30 caracteres.';
    }

    const direccion = String(farmacia.direccion ?? '').trim();
    if (direccion.length > 150) {
        return 'La dirección no puede superar 150 caracteres.';
    }

    const telefono = String(farmacia.telefono ?? '').trim();
    if (telefono.length > 20) {
        return 'El teléfono no puede superar 20 caracteres.';
    }
    if (telefono && !REGEX_TELEFONO.test(telefono)) {
        return 'Ingresa un teléfono válido de hasta 20 caracteres.';
    }

    return null;
};

const normalizarDatosParametros = (body) => ({
    margenAlertaDias: Number(body.margenAlertaDias),
    stockSeguridad: Number(body.stockSeguridad),
    diasReposicion: Number(body.diasReposicion),
    ventanaDemandaDias: Number(body.ventanaDemandaDias),
    farmacia: {
        nombre: String(body.farmacia.nombre ?? '').trim(),
        nit: String(body.farmacia.nit ?? '').trim(),
        direccion: String(body.farmacia.direccion ?? '').trim(),
        telefono: String(body.farmacia.telefono ?? '').trim(),
    },
});

module.exports = {
    validarDatosParametros,
    normalizarDatosParametros,
};
