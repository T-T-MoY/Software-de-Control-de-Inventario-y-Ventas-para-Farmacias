const assert = require('node:assert/strict');
const { validarDatosCliente } = require('../presentation/validators/sales.validator');

const clienteBase = {
    nombres: 'Farmacia San Juan',
    apellido_paterno: '',
    apellido_materno: '',
    ci_nit: '12345678',
};

test('permite registrar una razón social sin apellido paterno', () => {
    assert.equal(validarDatosCliente(clienteBase), null);
});

test('sigue validando el formato del CI/NIT en el alta rápida', () => {
    assert.match(
        validarDatosCliente({ ...clienteBase, ci_nit: '12' }),
        /CI\/NIT/
    );
});

test('sigue validando los caracteres permitidos en el nombre', () => {
    assert.match(
        validarDatosCliente({ ...clienteBase, nombres: 'Farmacia <script>' }),
        /nombres/
    );
});
