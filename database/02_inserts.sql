-- =====================================================================
-- 02_datos_iniciales.sql
-- Datos de ejemplo. Corre después de 01_init.sql.
-- Los IDs son SERIAL y la base está vacía, así que quedan 1, 2, 3...
-- en el mismo orden de los INSERT (las FK de abajo dependen de eso).
--
-- Contraseñas de prueba (cámbialas fuera de desarrollo):
--   Las tres cuentas usan la contraseña Passw123 (hash bcrypt, coste 12).
-- =====================================================================

-- ---------------------------------------------------------------------
-- ROLES (los 3 del sistema)
-- ---------------------------------------------------------------------
INSERT INTO rol (nombre_rol, descripcion) VALUES
('Administrador',          'Control total del sistema, usuarios y reportes'),
('Encargado de inventario','Gestiona medicamentos, lotes, proveedores y recepciones'),
('Ventas',                 'Realiza ventas en caja y emite comprobantes');

-- ---------------------------------------------------------------------
-- USUARIOS (uno por rol)
-- ---------------------------------------------------------------------
INSERT INTO usuario
    (nombres, apellido_paterno, apellido_materno, fecha_nacimiento, correo, ci, contrasena_hash, estado_cuenta, id_rol)
VALUES
('Carlos Andrés', 'Mamani', 'Quispe',  '1985-03-14', 'admin@farmacia.bo',      '4587123',
 '$2a$12$dBxhqwYRrR82IYokhgkt7OVP5pcH8lPwZ67x28Evxrbq4n.VwPk0a', 'Activo', 1),
('Rosa María',    'Choque', 'Villca',  '1990-07-22', 'inventario@farmacia.bo', '6012345',
 '$2a$12$dBxhqwYRrR82IYokhgkt7OVP5pcH8lPwZ67x28Evxrbq4n.VwPk0a', 'Activo', 2),
('Luis Alberto',  'Flores', 'Condori', '1998-11-05', 'ventas@farmacia.bo',     '8123456',
 '$2a$12$dBxhqwYRrR82IYokhgkt7OVP5pcH8lPwZ67x28Evxrbq4n.VwPk0a', 'Activo', 3);

-- ---------------------------------------------------------------------
-- CATEGORÍAS
-- ---------------------------------------------------------------------
INSERT INTO categoria (nombre_categoria) VALUES
('Analgésicos'),             -- 1
('Antiinflamatorios'),       -- 2
('Antibióticos'),            -- 3
('Antihistamínicos'),        -- 4
('Gastrointestinales'),      -- 5
('Vitaminas y suplementos'), -- 6
('Respiratorios');           -- 7

-- ---------------------------------------------------------------------
-- MEDICAMENTOS
-- El medicamento 9 está 'Inactivo' (borrado lógico): no sale en el
-- catálogo ni se vende, pero se conserva para el historial. Las fotos
-- son opcionales y se cargan desde el catálogo después de iniciar el sistema.
-- ---------------------------------------------------------------------
INSERT INTO medicamento
    (codigo_barras, nombre_comercial, dci, concentracion, forma_farmaceutica, precio_unitario,
     tipo_venta, stock_seguridad, dias_reposicion, estado_medicamento, foto_url, id_categoria)
VALUES
('7770000000011', 'Dolofin',         'Paracetamol',     '500 mg',      'Tableta', 5.00,  'Libre',      20, 3, 'Activo',   NULL, 1),
('7770000000028', 'Ibufen',          'Ibuprofeno',      '400 mg',      'Tableta', 12.00, 'Libre',      15, 3, 'Activo',   NULL, 2),
('7770000000035', 'Amoxibol',        'Amoxicilina',     '500 mg',      'Cápsula', 38.00, 'Con receta', 10, 5, 'Activo',   NULL, 3),
('7770000000042', 'Loratex',         'Loratadina',      '10 mg',       'Tableta', 15.00, 'Libre',      15, 3, 'Activo',   NULL, 4),
('7770000000059', 'Omeprazol Andes', 'Omeprazol',       '20 mg',       'Cápsula', 22.00, 'Libre',      10, 3, 'Activo',   NULL, 5),
('7770000000066', 'VitaC Plus',      'Ácido ascórbico', '500 mg',      'Tableta', 30.00, 'Libre',      10, 5, 'Activo',   NULL, 6),
('7770000000073', 'Bronquil',        'Ambroxol',        '15 mg/5 mL',  'Jarabe',  25.00, 'Libre',       8, 3, 'Activo',   NULL, 7),
('7770000000080', 'Diclogel',        'Diclofenaco',     '1 %',         'Crema',   18.00, 'Libre',       8, 3, 'Activo',   NULL, 2),
('7770000000097', 'Cafiaspin',       'Ácido acetilsalicílico', '500 mg', 'Tableta', 6.00, 'Libre',     10, 3, 'Inactivo', NULL, 1);

-- ---------------------------------------------------------------------
-- MEDICAMENTOS (NUEVOS): 9 tuplas con referencias reales del catálogo
-- de farmacorp.com (Shopify). Datos verificados en el sitio oficial:
-- https://farmacorp.com/collections/medicamentos
--   Aspirineta             -> Analgésicos (Ácido acetilsalicílico 100mg)
--   Dolo Febrex             -> Antiinflamatorios (Ibuprofeno 600mg)
--   Dioxadol               -> Analgésicos (Dipirona 500mg)
--   Divafen                -> Antiinflamatorios (Diclofenaco sódico 50mg)
--   Melox-Letic            -> Antiinflamatorios (Meloxicam 15mg)
--   Actron                 -> Antiinflamatorios (Ibuprofeno 600mg)
--   Terracolin             -> Gastrointestinales (Nifuroxazida 200mg)
--   Quetorol               -> Antiinflamatorios (Ketorolaco 30mg)
--   Vacuna Influvac Tetra -> Respiratorios (Vacuna Influenza Tetra)
-- Las fotos son opcionales y se cargan desde el catálogo después de
-- iniciar el sistema; el stock vigente se registra con los lotes.
-- ---------------------------------------------------------------------
INSERT INTO medicamento
    (codigo_barras, nombre_comercial, dci, concentracion, forma_farmaceutica, precio_unitario,
     tipo_venta, stock_seguridad, dias_reposicion, estado_medicamento, foto_url, id_categoria)
VALUES
('7770000000101', 'Aspirineta',            'Ácido acetilsalicílico', '100 mg',           'Tableta',    0.81,  'Libre',      25, 3, 'Activo',   NULL, 1),
('7770000000118', 'Dolo Febrex',           'Ibuprofeno',              '600 mg',           'Tableta',    1.68,  'Libre',      20, 3, 'Activo',   NULL, 2),
('7770000000125', 'Dioxadol',              'Dipirona',                '500 mg',           'Tableta',    3.57,  'Libre',      12, 3, 'Activo',   NULL, 1),
('7770000000132', 'Divafen',               'Diclofenaco sódico',      '50 mg',            'Tableta',    0.97,  'Libre',      18, 5, 'Activo',   NULL, 2),
('7770000000149', 'Melox-Letic',           'Meloxicam',               '15 mg',            'Tableta',    2.88,  'Libre',      10, 5, 'Activo',   NULL, 2),
('7770000000156', 'Actron',                'Ibuprofeno',              '600 mg',           'Cápsula',    5.51,  'Libre',      10, 3, 'Activo',   '/uploads/medicamentos/e4c7ab01-e2b0-49a3-8fd3-c7a9ca5dfc0b.jpg', 2),
('7770000000163', 'Terracolin',            'Nifuroxazida',            '200 mg',           'Tableta',    1.94,  'Libre',      30, 3, 'Activo',   NULL, 5),
('7770000000170', 'Quetorol',              'Ketorolaco',              '30 mg',            'Tableta',    5.00,  'Libre',       8, 5, 'Activo',   NULL, 2),
('7770000000187', 'Vacuna Influvac Tetra', 'Influenza',              'Quadrivalente',    'Inyectable', 212.00, 'Libre',      10, 30, 'Activo',   NULL, 7);

-- ---------------------------------------------------------------------
-- PROVEEDORES
-- ---------------------------------------------------------------------
INSERT INTO proveedor (nombre_comercial, ruc_nit, telefono, correo_electronico, direccion) VALUES
('Droguería Inti S.R.L.',       '1020304050', '22411122', 'ventas@drogueriainti.bo',   'Av. Montes #845, La Paz'),
('Distribuidora Andina Pharma', '1020405060', '22533344', 'pedidos@andinapharma.bo',   'Calle Yanacocha #310, La Paz'),
('Importadora Médica Illimani', '1020506070', '22655566', 'contacto@illimanimedica.bo','Av. Camacho #1520, La Paz');

-- ---------------------------------------------------------------------
-- LOTES (fechas relativas a hoy para poder probar las alertas)
--   lote 2  -> vence en 20 días  (dentro del margen de alerta de 30)
--   lote 8  -> ya vencido, sin baja (la venta debe bloquearse)
--   lote 10 -> vencido y dado de baja (stock 0)
-- El stock de los lotes 1, 3, 4, 5 y 7 ya está descontado por las ventas de ejemplo.
-- ---------------------------------------------------------------------
INSERT INTO lote
    (id_medicamento, id_proveedor, lote_numero, fecha_recepcion, fecha_vencimiento, costo_unitario, cantidad_stock, fecha_baja)
VALUES
(1, 1, 'DOL-2026-A', CURRENT_DATE - 45,  CURRENT_DATE + 500, 3.00,  117, NULL),                 -- 1
(1, 2, 'DOL-2025-Z', CURRENT_DATE - 200, CURRENT_DATE + 20,  2.80,   40, NULL),                 -- 2
(2, 1, 'IBU-2026-A', CURRENT_DATE - 30,  CURRENT_DATE + 400, 7.50,   78, NULL),                 -- 3
(3, 3, 'AMX-2026-A', CURRENT_DATE - 20,  CURRENT_DATE + 300, 24.00,  58, NULL),                 -- 4
(4, 2, 'LOR-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 450, 9.00,   49, NULL),                 -- 5
(5, 1, 'OME-2026-A', CURRENT_DATE - 40,  CURRENT_DATE + 380, 13.50,  70, NULL),                 -- 6
(6, 3, 'VIT-2026-A', CURRENT_DATE - 25,  CURRENT_DATE + 600, 18.00,  43, NULL),                 -- 7
(7, 2, 'BRO-2025-B', CURRENT_DATE - 300, CURRENT_DATE - 10,  15.00,  12, NULL),                 -- 8
(8, 3, 'DIC-2026-A', CURRENT_DATE - 10,  CURRENT_DATE + 420, 11.00,  35, NULL),                 -- 9
(7, 2, 'BRO-2024-C', CURRENT_DATE - 500, CURRENT_DATE - 60,  14.00,   0, CURRENT_DATE - 55);   -- 10

-- ---------------------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------------------
INSERT INTO cliente
    (nombres, apellido_paterno, apellido_materno, ci_nit, telefono, domicilio)
VALUES
('Juan Carlos', 'Mamani', 'Flores',  '4521897', '71234567', 'Calle Murillo #456, La Paz'),
('María Elena', 'Quispe', 'Condori', '5876543', '76543210', 'Av. Buenos Aires #1234, La Paz'),
('Pedro Luis',  'Apaza',  'Ticona',  '3987120', '70123456', 'Zona Villa Fátima, La Paz');

-- ---------------------------------------------------------------------
-- VENTAS (sin descuento) y DISPENSA (líneas de cada venta)
--   Las ventas 2 y 4 incluyen Amoxibol (Con receta): la receta se validó
--   en pantalla y no se guarda.
-- ---------------------------------------------------------------------
INSERT INTO venta (id_cliente, id_usuario, fecha_hora_venta, descuento_porcentaje, monto_recibido) VALUES
(1, 3, CURRENT_TIMESTAMP - INTERVAL '3 days',  0, 50.00),
(2, 3, CURRENT_TIMESTAMP - INTERVAL '2 days',  0, 60.00),
(1, 3, CURRENT_TIMESTAMP - INTERVAL '1 day',   0, 60.00),
(3, 3, CURRENT_TIMESTAMP - INTERVAL '5 hours', 0, 40.00);

INSERT INTO dispensa (id_venta, id_lote, cantidad, precio_venta) VALUES
(1, 1, 3,  5.00),   -- Dolofin x3   = 15.00
(1, 3, 2, 12.00),   -- Ibufen x2    = 24.00  -> total 39.00, cambio 11.00
(2, 4, 1, 38.00),   -- Amoxibol x1  = 38.00
(2, 5, 1, 15.00),   -- Loratex x1   = 15.00  -> total 53.00, cambio 7.00
(3, 7, 2, 30.00),   -- VitaC x2     = 60.00  -> total 60.00, cambio 0.00
(4, 4, 1, 38.00);   -- Amoxibol x1  = 38.00  -> total 38.00, cambio 2.00

INSERT INTO comprobante_venta (id_venta, tipo_comprobante, num_serie, formato_impresion) VALUES
(1, 'Nota de venta', 'NV-2026-000001', 'Impreso'),
(2, 'Factura',       'F-2026-000001',  'Impreso'),
(3, 'Nota de venta', 'NV-2026-000002', 'Pantalla'),
(4, 'Nota de venta', 'NV-2026-000003', 'Pantalla');

-- ---------------------------------------------------------------------
-- HISTORIAL DE OPERACIONES
-- id_registro = id_venta (VENTA) o id_lote (RECEPCION, BAJA)
-- La baja la registra el Administrador (usuario 1), según la matriz de permisos.
-- ---------------------------------------------------------------------
INSERT INTO historial_operacion (id_usuario, tipo_operacion, id_registro, fecha_hora) VALUES
(2, 'RECEPCION', 1,  CURRENT_TIMESTAMP - INTERVAL '45 days'),
(2, 'RECEPCION', 3,  CURRENT_TIMESTAMP - INTERVAL '30 days'),
(2, 'RECEPCION', 4,  CURRENT_TIMESTAMP - INTERVAL '20 days'),
(1, 'BAJA',      10, CURRENT_TIMESTAMP - INTERVAL '55 days'),
(3, 'VENTA',     1,  CURRENT_TIMESTAMP - INTERVAL '3 days'),
(3, 'VENTA',     2,  CURRENT_TIMESTAMP - INTERVAL '2 days'),
(3, 'VENTA',     3,  CURRENT_TIMESTAMP - INTERVAL '1 day'),
(3, 'VENTA',     4,  CURRENT_TIMESTAMP - INTERVAL '5 hours');