-- =====================================================================
-- 02_inserts.sql
-- Datos de ejemplo. Corre después de 01_init.sql.
-- Los IDs son SERIAL y la base está vacía, así que quedan 1, 2, 3...
-- en el mismo orden de los INSERT (las FK de abajo dependen de eso).
--
-- Contraseñas de prueba (cámbialas fuera de desarrollo):
--   Las tres cuentas usan la contraseña Passw123 (hash bcrypt, coste 12).
--
-- Los medicamentos y precios (Bs) están tomados del catálogo público de
-- Farmacorp (https://farmacorp.com). Las fechas de lotes y ventas son
-- relativas a la fecha en que se crea la base.
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
('Respiratorios'),           -- 7
('Cardiovasculares'),        -- 8
('Dermatológicos');          -- 9

-- ---------------------------------------------------------------------
-- MEDICAMENTOS (productos reales del catálogo de Farmacorp)
--   stock_seguridad = SS y dias_reposicion = L de la fórmula
--   ROP = ceil(D x L) + SS (RD4). Todos tienen L >= 1.
--   El medicamento 28 está 'Inactivo' (borrado lógico): no sale en el
--   catálogo ni se vende, pero se conserva para el historial.
--   Las fotos son opcionales y se cargan desde el catálogo.
--   El medicamento 5 (Zoltum 40 mg, L = 5 y SS = 10) sirve para CP-13.
-- ---------------------------------------------------------------------
INSERT INTO medicamento
    (codigo_barras, nombre_comercial, dci, concentracion, forma_farmaceutica, precio_unitario,
     tipo_venta, stock_seguridad, dias_reposicion, estado_medicamento, foto_url, id_categoria)
VALUES
('7770000001001', 'Terracolin',            'Nifuroxazida',                  '200 mg',           'Tableta',    1.94,  'Libre',      30,  3, 'Activo',   NULL, 5),  -- 1
('7770000001002', 'Domper',                'Domperidona',                   '10 mg',            'Tableta',    4.89,  'Libre',      15,  3, 'Activo',   NULL, 5),  -- 2
('7770000001003', 'Diposan',               'Dimetilpolisiloxano',           '100 mg',           'Tableta',    2.75,  'Libre',      20,  3, 'Activo',   NULL, 5),  -- 3
('7770000001004', 'Ome-Gastrin',           'Omeprazol',                     '20 mg',            'Cápsula',    3.95,  'Libre',      20,  3, 'Activo',   NULL, 5),  -- 4
('7770000001005', 'Zoltum',                'Pantoprazol',                   '40 mg',            'Tableta',   20.58,  'Libre',      10,  5, 'Activo',   NULL, 5),  -- 5
('7770000001006', 'Alumag',                'Magaldrato + Simeticona',       '800 mg / 100 mg',  'Tableta',    5.86,  'Libre',      15,  3, 'Activo',   NULL, 5),  -- 6
('7770000001007', 'Ibumed',                'Ibuprofeno',                    '600 mg',           'Cápsula',    4.50,  'Libre',      20,  3, 'Activo',   NULL, 2),  -- 7
('7770000001008', 'Dolo Febrex',           'Ibuprofeno',                    '600 mg',           'Tableta',    1.68,  'Libre',      20,  3, 'Activo',   NULL, 2),  -- 8
('7770000001009', 'Divafen',               'Diclofenaco sódico',            '50 mg',            'Tableta',    0.97,  'Libre',      18,  5, 'Activo',   NULL, 2),  -- 9
('7770000001010', 'Melox-Letic',           'Meloxicam',                     '15 mg',            'Tableta',    2.88,  'Libre',      10,  5, 'Activo',   NULL, 2),  -- 10
('7770000001011', 'Quetorol',              'Ketorolaco',                    '30 mg',            'Tableta',    5.00,  'Libre',       8,  5, 'Activo',   NULL, 2),  -- 11
('7770000001012', 'Aspirineta',            'Ácido acetilsalicílico',        '100 mg',           'Tableta',    0.81,  'Libre',      25,  3, 'Activo',   NULL, 1),  -- 12
('7770000001013', 'Dioxadol',              'Dipirona',                      '500 mg',           'Tableta',    3.57,  'Libre',      12,  3, 'Activo',   NULL, 1),  -- 13
('7770000001014', 'Dormyn Zzz',            'Doxilamina',                    '25 mg',            'Tableta',    3.69,  'Libre',      10,  3, 'Activo',   NULL, 4),  -- 14
('7770000001015', 'Ciprofloxacina',        'Ciprofloxacina',                '500 mg',           'Tableta',    2.27,  'Con receta', 15,  5, 'Activo',   NULL, 3),  -- 15
('7770000001016', 'Levofloxacina',         'Levofloxacina',                 '500 mg',           'Tableta',    7.89,  'Con receta', 10,  5, 'Activo',   NULL, 3),  -- 16
('7770000001017', 'Cefixima',              'Cefixima',                      '400 mg',           'Cápsula',    6.76,  'Con receta', 10,  5, 'Activo',   NULL, 3),  -- 17
('7770000001018', 'Montetricina',          'Montelukast',                   '10 mg',            'Tableta',    6.24,  'Con receta',  8,  5, 'Activo',   NULL, 7),  -- 18
('7770000001019', 'Vacuna Influvac Tetra', 'Virus de la influenza',         'Tetravalente',     'Inyectable',212.00, 'Libre',      10, 30, 'Activo',   NULL, 7),  -- 19
('7770000001020', 'Vitamina C La Sante',   'Ácido ascórbico',               '500 mg',           'Tableta',    1.27,  'Libre',      30,  5, 'Activo',   NULL, 6),  -- 20
('7770000001021', 'Zinc Genérico',         'Zinc',                          '50 mg',            'Tableta',    2.19,  'Libre',      20,  5, 'Activo',   NULL, 6),  -- 21
('7770000001022', 'Vimin D3',              'Colecalciferol (Vitamina D3)',  '1000 UI',          'Cápsula',    3.14,  'Libre',      15,  5, 'Activo',   NULL, 6),  -- 22
('7770000001023', 'Complejo B',            'Vitaminas del complejo B',      'Multivitamínico',  'Tableta',    1.31,  'Libre',      20,  5, 'Activo',   NULL, 6),  -- 23
('7770000001024', 'Zinc Vimin',            'Zinc',                          '20 mg / 5 mL',     'Jarabe',    73.00,  'Libre',       8,  5, 'Activo',   NULL, 6),  -- 24
('7770000001025', 'Atorvastatina',         'Atorvastatina',                 '10 mg',            'Tableta',    2.59,  'Con receta', 20,  5, 'Activo',   NULL, 8),  -- 25
('7770000001026', 'Pressaliv',             'Losartán potásico',             '50 mg',            'Tableta',    0.90,  'Con receta', 20,  5, 'Activo',   NULL, 8),  -- 26
('7770000001027', 'Furosemida',            'Furosemida',                    '40 mg',            'Tableta',    1.70,  'Con receta', 15,  5, 'Activo',   NULL, 8),  -- 27
('7770000001028', 'Ultracilina',           'Dexametasona + Gentamicina + Bifonazol', '0.05 % / 0.1 % / 1 %', 'Crema', 72.36, 'Con receta', 5, 5, 'Inactivo', NULL, 9);  -- 28

-- ---------------------------------------------------------------------
-- PROVEEDORES
-- ---------------------------------------------------------------------
INSERT INTO proveedor (nombre_comercial, ruc_nit, telefono, correo_electronico, direccion) VALUES
('Droguería Inti S.R.L.',       '1020304050', '22411122', 'ventas@drogueriainti.bo',   'Av. Montes #845, La Paz'),
('Distribuidora Andina Pharma', '1020405060', '22533344', 'pedidos@andinapharma.bo',   'Calle Yanacocha #310, La Paz'),
('Importadora Médica Illimani', '1020506070', '22655566', 'contacto@illimanimedica.bo','Av. Camacho #1520, La Paz');

-- ---------------------------------------------------------------------
-- LOTES (fechas relativas a hoy para poder probar las alertas)
--   lote 5  -> Zoltum con stock 31: ROP = 30 (D = 4, L = 5, SS = 10), sin alerta
--              (con 30 o menos, sí alerta: CP-13)
--   lote 9  -> Divafen con 15 (SS = 18): alerta de reorden
--   lote 17 -> Cefixima con 8 (ROP = 11): alerta de reorden
--   lote 18 -> Montetricina vencida, sin baja (la venta debe bloquearse)
--   lote 19 -> Montetricina vencida y dada de baja (stock 0)
--   lote 29 -> Terracolin vence en 20 días (dentro del margen de 30)
-- El stock de los lotes ya está descontado por las ventas de ejemplo.
-- ---------------------------------------------------------------------
INSERT INTO lote
    (id_medicamento, id_proveedor, lote_numero, fecha_recepcion, fecha_vencimiento, costo_unitario, cantidad_stock, fecha_baja)
VALUES
(1,  1, 'TER-2026-A', CURRENT_DATE - 45,  CURRENT_DATE + 500, 1.20,   140, NULL),   -- 1
(2,  2, 'DOM-2026-A', CURRENT_DATE - 30,  CURRENT_DATE + 400, 3.00,    80, NULL),   -- 2
(3,  1, 'DIP-2026-A', CURRENT_DATE - 30,  CURRENT_DATE + 420, 1.60,    95, NULL),   -- 3
(4,  3, 'OME-2026-A', CURRENT_DATE - 25,  CURRENT_DATE + 380, 2.40,   120, NULL),   -- 4
(5,  1, 'ZOL-2026-A', CURRENT_DATE - 20,  CURRENT_DATE + 450, 13.00,   31, NULL),   -- 5
(6,  2, 'ALU-2026-A', CURRENT_DATE - 20,  CURRENT_DATE + 400, 3.60,    60, NULL),   -- 6
(7,  3, 'IBM-2026-A', CURRENT_DATE - 40,  CURRENT_DATE + 380, 2.90,   100, NULL),   -- 7
(8,  1, 'DFB-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 400, 1.00,   150, NULL),   -- 8
(9,  2, 'DIV-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 400, 0.60,    15, NULL),   -- 9
(10, 3, 'MEL-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 400, 1.80,    60, NULL),   -- 10
(11, 1, 'QUE-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 400, 3.00,    40, NULL),   -- 11
(12, 2, 'ASP-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 400, 0.50,   200, NULL),   -- 12
(13, 3, 'DIO-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 400, 2.20,    80, NULL),   -- 13
(14, 1, 'DOR-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 300, 2.20,    45, NULL),   -- 14
(15, 2, 'CIP-2026-A', CURRENT_DATE - 20,  CURRENT_DATE + 300, 1.40,    58, NULL),   -- 15
(16, 3, 'LEV-2026-A', CURRENT_DATE - 20,  CURRENT_DATE + 300, 5.00,    38, NULL),   -- 16
(17, 1, 'CEF-2026-A', CURRENT_DATE - 20,  CURRENT_DATE + 300, 4.50,     8, NULL),   -- 17
(18, 2, 'MON-2025-B', CURRENT_DATE - 300, CURRENT_DATE - 10,  4.00,    12, NULL),   -- 18
(18, 2, 'MON-2024-C', CURRENT_DATE - 500, CURRENT_DATE - 60,  3.80,     0, CURRENT_DATE - 55),  -- 19
(19, 3, 'INF-2026-A', CURRENT_DATE - 10,  CURRENT_DATE + 200, 150.00,  25, NULL),   -- 20
(20, 1, 'VTC-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 600, 0.70,   180, NULL),   -- 21
(21, 2, 'ZIN-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 600, 1.30,    90, NULL),   -- 22
(22, 3, 'VD3-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 500, 2.00,    70, NULL),   -- 23
(23, 1, 'CPB-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 500, 0.80,   110, NULL),   -- 24
(24, 2, 'ZNJ-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 300, 50.00,   20, NULL),   -- 25
(25, 3, 'ATO-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 400, 1.60,   100, NULL),   -- 26
(26, 1, 'PRE-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 400, 0.50,   120, NULL),   -- 27
(27, 2, 'FUR-2026-A', CURRENT_DATE - 15,  CURRENT_DATE + 400, 1.00,    90, NULL),   -- 28
(1,  2, 'TER-2025-Z', CURRENT_DATE - 200, CURRENT_DATE + 20,  1.10,    40, NULL);   -- 29

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
--   Las ventas 2 y 4 incluyen Cefixima (Con receta): la receta se validó
--   en pantalla y no se guarda.
-- ---------------------------------------------------------------------
INSERT INTO venta (id_cliente, id_usuario, fecha_hora_venta, descuento_porcentaje, monto_recibido) VALUES
(1, 3, CURRENT_TIMESTAMP - INTERVAL '3 days',  0, 20.00),
(2, 3, CURRENT_TIMESTAMP - INTERVAL '2 days',  0, 30.00),
(1, 3, CURRENT_TIMESTAMP - INTERVAL '1 day',   0, 20.00),
(3, 3, CURRENT_TIMESTAMP - INTERVAL '5 hours', 0, 30.00);

INSERT INTO dispensa (id_venta, id_lote, cantidad, precio_venta) VALUES
(1, 1,  3,  1.94),   -- Terracolin x3   =  5.82
(1, 7,  2,  4.50),   -- Ibumed x2       =  9.00  -> total 14.82, cambio 5.18
(2, 17, 1,  6.76),   -- Cefixima x1     =  6.76  (con receta)
(2, 5,  1, 20.58),   -- Zoltum x1       = 20.58  -> total 27.34, cambio 2.66
(3, 21, 10, 1.27),   -- Vitamina C x10  = 12.70
(3, 22, 2,  2.19),   -- Zinc x2         =  4.38  -> total 17.08, cambio 2.92
(4, 17, 1,  6.76),   -- Cefixima x1     =  6.76  (con receta)
(4, 5,  1, 20.58);   -- Zoltum x1       = 20.58  -> total 27.34, cambio 2.66

INSERT INTO comprobante_venta (id_venta, tipo_comprobante, num_serie, formato_impresion) VALUES
(1, 'Nota de venta', 'NV-2026-000001', 'Impreso'),
(2, 'Factura',       'F-2026-000001',  'Impreso'),
(3, 'Nota de venta', 'NV-2026-000002', 'Pantalla'),
(4, 'Nota de venta', 'NV-2026-000003', 'Pantalla');

-- ---------------------------------------------------------------------
-- DEMANDA DE ZOLTUM PARA CP-13 (RD4: D = 4, L = 5, SS = 10, ROP = 30)
--   26 ventas (de hace 4 a 29 días) con 118 unidades del lote 5, más las 2
--   unidades de las ventas 2 y 4 = 120 unidades en 30 días -> D = 120 / 30 = 4.
--   Con stock 31 no hay alerta; si baja a 30 o menos, sí.
-- ---------------------------------------------------------------------
WITH nuevas AS (
    INSERT INTO venta (id_cliente, id_usuario, fecha_hora_venta, descuento_porcentaje, monto_recibido)
    SELECT 1 + (n % 3), 3, CURRENT_TIMESTAMP - make_interval(days => n), 0, 200.00
    FROM generate_series(4, 29) AS n
    RETURNING id_venta, fecha_hora_venta
)
INSERT INTO dispensa (id_venta, id_lote, cantidad, precio_venta)
SELECT id_venta, 5,
       CASE WHEN row_number() OVER (ORDER BY fecha_hora_venta DESC) <= 14 THEN 5 ELSE 4 END,
       20.58
FROM nuevas;

-- Comprobante de cada una de esas ventas
INSERT INTO comprobante_venta (id_venta, tipo_comprobante, num_serie, fecha_emision, formato_impresion)
SELECT id_venta, 'Nota de venta',
       'NV-' || to_char(fecha_hora_venta, 'YYYY') || '-' || lpad((100 + id_venta)::text, 6, '0'),
       fecha_hora_venta, 'Pantalla'
FROM venta
WHERE id_venta > 4;

-- ---------------------------------------------------------------------
-- HISTORIAL DE OPERACIONES
-- id_registro = id_venta (VENTA) o id_lote (RECEPCION, BAJA)
-- La baja la registra el Administrador (usuario 1), según la matriz de permisos.
-- ---------------------------------------------------------------------
INSERT INTO historial_operacion (id_usuario, tipo_operacion, id_registro, fecha_hora) VALUES
(2, 'RECEPCION', 1,  CURRENT_TIMESTAMP - INTERVAL '45 days'),
(2, 'RECEPCION', 7,  CURRENT_TIMESTAMP - INTERVAL '40 days'),
(2, 'RECEPCION', 15, CURRENT_TIMESTAMP - INTERVAL '20 days'),
(1, 'BAJA',      19, CURRENT_TIMESTAMP - INTERVAL '55 days'),
(3, 'VENTA',     1,  CURRENT_TIMESTAMP - INTERVAL '3 days'),
(3, 'VENTA',     2,  CURRENT_TIMESTAMP - INTERVAL '2 days'),
(3, 'VENTA',     3,  CURRENT_TIMESTAMP - INTERVAL '1 day'),
(3, 'VENTA',     4,  CURRENT_TIMESTAMP - INTERVAL '5 hours');

INSERT INTO historial_operacion (id_usuario, tipo_operacion, id_registro, fecha_hora)
SELECT 3, 'VENTA', id_venta, fecha_hora_venta
FROM venta
WHERE id_venta > 4;