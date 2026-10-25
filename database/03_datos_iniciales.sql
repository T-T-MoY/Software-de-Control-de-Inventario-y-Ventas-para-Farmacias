-- Catálogos mínimos para iniciar el sistema. La contraseña inicial del
-- administrador se documenta en readme.md y debe cambiarse al ingresar.

INSERT INTO rol (nombre_rol, descripcion) VALUES
    ('Administrador', 'Administra usuarios y configuración del sistema'),
    ('Encargado de inventario', 'Gestiona inventario y proveedores'),
    ('Ventas', 'Gestiona ventas y atención al cliente')
ON CONFLICT (nombre_rol) DO NOTHING;

INSERT INTO usuario (
    nombre,
    apellido_paterno,
    apellido_materno,
    fecha_nacimiento,
    correo,
    ci_nit,
    contrasena_hash,
    estado_cuenta,
    id_rol
)
SELECT
    'Carlos Andrés',
    'Mamani',
    'Quispe',
    DATE '1985-03-14',
    'admin@farmacia.bo',
    '4587123',
    '$2b$10$3qu6v1rt8K4RKgjtNQjADuHD7F7x/fxLro3w0G6zXdsMJFnIGyqN6',
    'Activo',
    id_rol
FROM rol
WHERE nombre_rol = 'Administrador'
ON CONFLICT (correo) DO NOTHING;

INSERT INTO parametro_sistema (nombre_parametro, valor) VALUES
    ('margen_alerta_dias', '30'),
    ('stock_seguridad_predeterminado', '10')
ON CONFLICT (nombre_parametro) DO NOTHING;

INSERT INTO categoria (nombre_categoria) VALUES
    ('Analgésicos'),
    ('Antiinflamatorios'),
    ('Antibióticos'),
    ('Antihistamínicos'),
    ('Gastrointestinales'),
    ('Vitaminas y suplementos'),
    ('Respiratorios')
ON CONFLICT (nombre_categoria) DO NOTHING;

INSERT INTO forma_farmaceutica (nombre_forma) VALUES
    ('Tableta'),
    ('Cápsula'),
    ('Jarabe'),
    ('Crema'),
    ('Inyectable'),
    ('Suspensión')
ON CONFLICT (nombre_forma) DO NOTHING;
