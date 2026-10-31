const { errorValidacion } = require('../errors/app-error');

const validarNumeroNoNegativo = (nombre, valor) => {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
        throw errorValidacion(`${nombre} debe ser un número finito mayor o igual a 0.`);
    }
};

const calcularPuntoReorden = ({
    demandaDiaria,
    diasReposicion,
    stockSeguridad,
}) => {
    validarNumeroNoNegativo('La demanda diaria', demandaDiaria);
    validarNumeroNoNegativo('Los días de reposición', diasReposicion);
    validarNumeroNoNegativo('El stock de seguridad', stockSeguridad);
    if (diasReposicion < 1) {
        throw errorValidacion('Los días de reposición deben ser mayores o iguales a 1.');
    }

    const producto = demandaDiaria * diasReposicion;
    if (!Number.isFinite(producto)) {
        throw errorValidacion('El producto de demanda y días de reposición no es válido.');
    }
    return Math.ceil(Number(producto.toFixed(4))) + stockSeguridad;
};

const evaluarReorden = ({
    stockActual,
    demandaDiaria,
    diasReposicion,
    stockSeguridad,
}) => {
    validarNumeroNoNegativo('El stock actual', stockActual);
    const puntoReorden = calcularPuntoReorden({
        demandaDiaria,
        diasReposicion,
        stockSeguridad,
    });
    return {
        puntoReorden,
        alerta: stockActual <= puntoReorden,
    };
};

module.exports = {
    calcularPuntoReorden,
    evaluarReorden,
};
