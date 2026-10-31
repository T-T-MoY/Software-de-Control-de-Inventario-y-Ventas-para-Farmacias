/**
 * Reglas de negocio del catálogo de medicamentos.
 *
 * Normaliza los datos que llegan de la interfaz y define los valores
 * permitidos por el esquema. La validación de forma (longitudes, formatos)
 * vive en presentation/validators/medicine.validator.js.
 */

const FORMAS_FARMACEUTICAS = Object.freeze([
    'Tableta',
    'Cápsula',
    'Jarabe',
    'Suspensión',
    'Crema',
    'Gel',
    'Inyectable',
    'Gotas',
]);

const TIPOS_VENTA = Object.freeze(['Libre', 'Con receta']);

const textoOpcional = (valor) => {
    if (valor === undefined || valor === null || valor === '') return undefined;
    return Number(valor);
};

/** Normaliza los datos antes de persistirlos. */
const normalizarDatosMedicamento = (datos) => ({
    codigo_barras: String(datos.codigo_barras ?? '').trim(),
    nombre_comercial: String(datos.nombre_comercial ?? '').trim(),
    dci: String(datos.dci ?? '').trim(),
    concentracion: String(datos.concentracion ?? '').trim(),
    forma_farmaceutica: String(datos.forma_farmaceutica ?? '').trim(),
    precio_unitario: Number(datos.precio_unitario),
    tipo_venta: String(datos.tipo_venta ?? 'Libre').trim(),
    stock_seguridad: textoOpcional(datos.stock_seguridad),
    dias_reposicion: textoOpcional(datos.dias_reposicion),
    id_categoria: Number(datos.id_categoria),
});

module.exports = {
    FORMAS_FARMACEUTICAS,
    TIPOS_VENTA,
    normalizarDatosMedicamento,
};
