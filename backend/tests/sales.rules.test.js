const assert = require('node:assert/strict');
const { ErrorAplicacion } = require('../business/errors/app-error');
const {
    calcularTotales,
    normalizarDatosVenta,
    validarReceta,
} = require('../business/rules/sales.rules');

test('calcula subtotal, descuento porcentual, total y cambio exactos en centavos', () => {
    assert.deepEqual(calcularTotales({
        items: [
            { precio_unitario: '1.94', cantidad: 3 },
            { precio_unitario: '4.50', cantidad: 2 },
        ],
        descuentoPorcentaje: 10,
        montoRecibido: 20,
    }), {
        subtotal: 14.82,
        descuento_monto: 1.48,
        total: 13.34,
        cambio: 6.66,
    });
});

test('rechaza pagos insuficientes y descuentos fuera del rango permitido', () => {
    assert.throws(() => calcularTotales({
        items: [{ precio_unitario: '10.00', cantidad: 1 }],
        descuentoPorcentaje: 0,
        montoRecibido: 9.99,
    }), ErrorAplicacion);

    assert.throws(() => normalizarDatosVenta({
        id_cliente: 1,
        items: [{ id_medicamento: 1, cantidad: 1 }],
        descuento_porcentaje: 101,
        monto_recibido: 10,
    }), ErrorAplicacion);
});

test('valida los datos de paciente, médico y matrícula requeridos por RD5', () => {
    assert.throws(() => validarReceta({
        paciente: 'Juan',
        medico: 'Dra. López',
        matricula: '',
    }), ErrorAplicacion);

    assert.doesNotThrow(() => validarReceta({
        paciente: 'Juan',
        medico: 'Dra. López',
        matricula: 'MED-123',
    }));
});
