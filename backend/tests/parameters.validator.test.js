const test = require('node:test');
const assert = require('node:assert/strict');

const {
    validarDatosParametros,
    normalizarDatosParametros,
} = require('../presentation/validators/parameters.validator');

const parametrosValidos = () => ({
    margenAlertaDias: 30,
    stockSeguridad: 10,
    diasReposicion: 5,
    ventanaDemandaDias: 30,
    farmacia: {
        nombre: 'Farmacia Central',
        nit: '1234567890',
        direccion: 'Av. Principal #123, La Paz',
        telefono: '22233344',
    },
});

test('acepta parámetros completos dentro de rango', () => {
    assert.equal(validarDatosParametros(parametrosValidos()), null);
});

test('exige los datos de la farmacia', () => {
    const datos = parametrosValidos();
    delete datos.farmacia;

    assert.match(validarDatosParametros(datos), /farmacia/i);
});

test('rechaza un margen que no es entero', () => {
    const datos = {
        ...parametrosValidos(),
        margenAlertaDias: 30.5,
    };

    assert.match(validarDatosParametros(datos), /margen/i);
});

test('rechaza números fuera de rango', () => {
    const stock = {
        ...parametrosValidos(),
        stockSeguridad: -1,
    };
    const reposicion = {
        ...parametrosValidos(),
        diasReposicion: 0,
    };

    assert.match(validarDatosParametros(stock), /stock de seguridad/i);
    assert.match(validarDatosParametros(reposicion), /días de reposición/i);
});

test('rechaza un teléfono con formato inválido', () => {
    const datos = parametrosValidos();
    datos.farmacia.telefono = 'abc';

    assert.match(validarDatosParametros(datos), /teléfono/i);
});

test('normaliza números y recorta espacios', () => {
    const normalizados = normalizarDatosParametros({
        margenAlertaDias: '45',
        stockSeguridad: '12',
        diasReposicion: '6',
        ventanaDemandaDias: '31',
        farmacia: {
            nombre: '  Farmacia Central  ',
            nit: ' 1234567890 ',
            direccion: ' Av. Principal #123 ',
            telefono: ' 22233344 ',
        },
    });

    assert.deepEqual(normalizados, {
        margenAlertaDias: 45,
        stockSeguridad: 12,
        diasReposicion: 6,
        ventanaDemandaDias: 31,
        farmacia: {
            nombre: 'Farmacia Central',
            nit: '1234567890',
            direccion: 'Av. Principal #123',
            telefono: '22233344',
        },
    });
});
