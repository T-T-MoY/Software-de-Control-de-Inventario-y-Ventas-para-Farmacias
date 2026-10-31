const test = require('node:test');
const assert = require('node:assert/strict');
const { ErrorAplicacion } = require('../business/errors/app-error');
const {
    calcularPuntoReorden,
    evaluarReorden,
} = require('../business/rules/inventory.rules');

test('CP-13 calcula ROP=30 con demanda 4, reposición 5 y seguridad 10', () => {
    assert.equal(calcularPuntoReorden({
        demandaDiaria: 4,
        diasReposicion: 5,
        stockSeguridad: 10,
    }), 30);
});

test('CP-13 alerta con stock igual al punto de reorden', () => {
    assert.deepEqual(evaluarReorden({
        stockActual: 30,
        demandaDiaria: 4,
        diasReposicion: 5,
        stockSeguridad: 10,
    }), { puntoReorden: 30, alerta: true });
});

test('CP-13 no alerta con stock sobre el punto de reorden', () => {
    assert.deepEqual(evaluarReorden({
        stockActual: 31,
        demandaDiaria: 4,
        diasReposicion: 5,
        stockSeguridad: 10,
    }), { puntoReorden: 30, alerta: false });
});

test('demanda cero deja el punto de reorden igual al stock de seguridad', () => {
    assert.equal(calcularPuntoReorden({
        demandaDiaria: 0,
        diasReposicion: 5,
        stockSeguridad: 10,
    }), 10);
});

test('la demanda fraccionaria redondea hacia arriba', () => {
    assert.equal(calcularPuntoReorden({
        demandaDiaria: 0.5,
        diasReposicion: 5,
        stockSeguridad: 0,
    }), 3);
});

test('rechaza valores negativos, no numéricos y L menor que 1', () => {
    const casosInvalidos = [
        { demandaDiaria: -1, diasReposicion: 5, stockSeguridad: 10 },
        { demandaDiaria: '4', diasReposicion: 5, stockSeguridad: 10 },
        { demandaDiaria: 4, diasReposicion: 0, stockSeguridad: 10 },
        { demandaDiaria: 4, diasReposicion: 5, stockSeguridad: -1 },
    ];

    for (const datos of casosInvalidos) {
        assert.throws(() => calcularPuntoReorden(datos), ErrorAplicacion);
    }
    assert.throws(() => evaluarReorden({
        stockActual: -1,
        demandaDiaria: 4,
        diasReposicion: 5,
        stockSeguridad: 10,
    }), ErrorAplicacion);
});
