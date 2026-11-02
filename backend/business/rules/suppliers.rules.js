
/**
 * Reglas de negocio para proveedores.
 * Normaliza los datos antes de enviarlos al repositorio.
 */

const { errorValidacion } = require('../errors/app-error');

const normalizarDatosProveedor = (datos) => {
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        throw errorValidacion('Los datos del proveedor son obligatorios.');
    }

    const nombreComercial = String(
        datos.nombre_comercial ?? ''
    ).trim();

    const rucNit = String(
        datos.ruc_nit ?? ''
    ).trim();

    if (!nombreComercial) {
        throw errorValidacion('El nombre comercial es obligatorio.');
    }

    if (!rucNit) {
        throw errorValidacion('El RUC/NIT es obligatorio.');
    }

    const normalizarOpcional = (valor) => {
        const texto = String(valor ?? '').trim();
        return texto || null;
    };

    return {
        nombre_comercial: nombreComercial,
        ruc_nit: rucNit,
        telefono: normalizarOpcional(datos.telefono),
        correo_electronico: normalizarOpcional(
            datos.correo_electronico
        )?.toLowerCase() || null,
        direccion: normalizarOpcional(datos.direccion),
    };
};

module.exports = {
    normalizarDatosProveedor,
};
