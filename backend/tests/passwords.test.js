const { BCRYPT_ROUNDS, hashPassword, verifyPassword } = require('../business/security/passwords');

describe('Hash de contraseñas (bcrypt)', () => {
  test('PU-PWD-01 el coste de bcrypt es 12', () => {
    expect(BCRYPT_ROUNDS).toBe(12);
  });

  test('PU-PWD-02 el hash no es la contraseña en texto plano y usa coste 12', async () => {
    const hash = await hashPassword('Clave#2026');
    expect(hash).not.toBe('Clave#2026');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  test('PU-PWD-03 verifyPassword acepta la clave correcta y rechaza la incorrecta', async () => {
    const hash = await hashPassword('Clave#2026');
    expect(await verifyPassword('Clave#2026', hash)).toBe(true);
    expect(await verifyPassword('clave#2026', hash)).toBe(false);
  });

  test('PU-PWD-04 la misma clave produce hashes distintos (salt aleatorio)', async () => {
    const [a, b] = await Promise.all([hashPassword('Clave#2026'), hashPassword('Clave#2026')]);
    expect(a).not.toBe(b);
  });

  test('PU-PWD-05 hashPassword rechaza una contraseña ausente', async () => {
    await expect(hashPassword(undefined)).rejects.toThrow();
  });
});