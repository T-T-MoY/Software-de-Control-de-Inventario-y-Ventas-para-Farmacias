const test = require('node:test');
const assert = require('node:assert/strict');

const {
    REPORTES,
    obtenerDefinicion,
    esFechaValida,
    normalizarFiltrosReporte,
    normalizarFiltrosHistorial,
    validarFormato,
    calcularTotales,
    describirOperacion,
} = require('../business/rules/reports.rules');
const { formatearNumero, formatearFecha } = require('../business/services/report-export.service');

const estado = (fn) => { try { fn(); return null; } catch (e) { return e.estado; } };

test('esFechaValida acepta fechas reales y rechaza irreales o mal formadas', () => {
    assert.equal(esFechaValida('2026-11-05'), true);
    assert.equal(esFechaValida('2028-02-29'), true);
    assert.equal(esFechaValida('2026-02-31'), false);
    assert.equal(esFechaValida('05/11/2026'), false);
    assert.equal(esFechaValida("2026-01-01';DROP"), false);
    assert.equal(esFechaValida(undefined), false);
});

test('ventas exige ambas fechas y que el rango sea coherente', () => {
    const ventas = REPORTES.ventas;
    assert.equal(estado(() => normalizarFiltrosReporte(ventas, {})), 400);
    assert.equal(estado(() => normalizarFiltrosReporte(ventas, { fechaInicio: '2026-11-01' })), 400);
    assert.equal(estado(() => normalizarFiltrosReporte(ventas, { fechaInicio: '2026-11-10', fechaFin: '2026-11-01' })), 400);
    assert.deepEqual(
        normalizarFiltrosReporte(ventas, { fechaInicio: '2026-11-01', fechaFin: '2026-11-05' }),
        { fechaInicio: '2026-11-01', fechaFin: '2026-11-05' }
    );
});

test('lotes y inventario aceptan filtros vacíos; inventario ignora fechas', () => {
    assert.deepEqual(normalizarFiltrosReporte(REPORTES['lotes-vencidos'], {}), { fechaInicio: null, fechaFin: null });
    assert.deepEqual(
        normalizarFiltrosReporte(REPORTES.inventario, { fechaInicio: 'basura' }),
        { fechaInicio: null, fechaFin: null }
    );
});

test('un reporte inexistente responde 404 (incluido __proto__)', () => {
    assert.equal(estado(() => obtenerDefinicion('compras')), 404);
    assert.equal(estado(() => obtenerDefinicion('__proto__')), 404);
});

test('validarFormato solo permite pdf y excel', () => {
    assert.equal(validarFormato('pdf'), 'pdf');
    assert.equal(validarFormato('excel'), 'excel');
    assert.equal(estado(() => validarFormato('docx')), 400);
    assert.equal(estado(() => validarFormato('')), 400);
});

test('calcularTotales suma importes sin errores de punto flotante', () => {
    const totales = calcularTotales(REPORTES.ventas, [
        { subtotal: '0.10', descuento_monto: '0', total: '0.10' },
        { subtotal: '0.20', descuento_monto: '0', total: '0.20' },
    ]);
    assert.equal(totales.subtotal, 0.3);
    assert.equal(totales.total, 0.3);
});

test('historial: valores por defecto, límites y tipo', () => {
    const base = normalizarFiltrosHistorial({});
    assert.equal(base.pagina, 1);
    assert.equal(base.limite, 25);
    assert.equal(estado(() => normalizarFiltrosHistorial({ tipo: 'BORRAR' })), 400);
    assert.equal(estado(() => normalizarFiltrosHistorial({ limite: '1000' })), 400);
    assert.equal(estado(() => normalizarFiltrosHistorial({ pagina: '0' })), 400);
    assert.equal(estado(() => normalizarFiltrosHistorial({ idUsuario: 'abc' })), 400);
    assert.equal(normalizarFiltrosHistorial({ tipo: 'BAJA', idUsuario: '3' }).idUsuario, 3);
});

test('describirOperacion arma un texto legible por tipo', () => {
    assert.equal(
        describirOperacion({ tipo_operacion: 'VENTA', id_registro: 1, referencia: 'NV-1', contraparte: 'Ana' }),
        'Venta NV-1 a Ana'
    );
    assert.equal(
        describirOperacion({ tipo_operacion: 'BAJA', id_registro: 7, referencia: 'L-9', medicamento: 'Zinc' }),
        'Baja del lote L-9 de Zinc'
    );
    assert.equal(describirOperacion({ tipo_operacion: 'RECEPCION', id_registro: 7 }), 'Recepción del lote #7');
});

test('formato de números y fechas del exportador', () => {
    assert.equal(formatearNumero(12723.389, 2), '12.723,39');
    assert.equal(formatearNumero(2165, 0), '2.165');
    assert.equal(formatearFecha('2026-11-05'), '05/11/2026');
});
