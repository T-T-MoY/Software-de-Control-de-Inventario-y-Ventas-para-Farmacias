-- =====================================================================
-- 01_init.sql
-- Software de Control de Inventario y Ventas para Farmacias
-- Creación de tablas (PostgreSQL)
--
-- Borrado lógico: las entidades con "estado" nunca se eliminan, se pasan
-- a 'Inactivo'. Las tablas de movimientos (venta, dispensa,
-- comprobante_venta, historial_operacion) no se modifican ni se borran.
-- =====================================================================

-- ---------------------------------------------------------------------
-- SEGURIDAD: roles y usuarios
-- ---------------------------------------------------------------------
CREATE TABLE rol (
    id_rol          SERIAL       PRIMARY KEY,
    nombre_rol      VARCHAR(50)  NOT NULL UNIQUE,
    descripcion     VARCHAR(150)
);

CREATE TABLE usuario (
    id_usuario        SERIAL        PRIMARY KEY,
    nombres           VARCHAR(80)   NOT NULL,
    apellido_paterno  VARCHAR(60)   NOT NULL,
    apellido_materno  VARCHAR(60),
    fecha_nacimiento  DATE          NOT NULL,
    correo            VARCHAR(120)  NOT NULL UNIQUE,
    ci_nit            VARCHAR(20)   NOT NULL UNIQUE,
    contrasena_hash   VARCHAR(100)  NOT NULL,
    estado_cuenta     VARCHAR(10)   NOT NULL DEFAULT 'Activo'
                      CHECK (estado_cuenta IN ('Activo', 'Inactivo')),
    fecha_registro    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_rol            INT           NOT NULL REFERENCES rol (id_rol)
);

-- ---------------------------------------------------------------------
-- INVENTARIO: categorías, medicamentos, proveedores y lotes
-- ---------------------------------------------------------------------
CREATE TABLE categoria (
    id_categoria      SERIAL        PRIMARY KEY,
    nombre_categoria  VARCHAR(60)   NOT NULL UNIQUE
);

CREATE TABLE medicamento (
    id_medicamento      SERIAL         PRIMARY KEY,
    codigo_barras       VARCHAR(20)    NOT NULL UNIQUE,
    nombre_comercial    VARCHAR(100)   NOT NULL,
    dci                 VARCHAR(100)   NOT NULL,
    concentracion       VARCHAR(40)    NOT NULL,
    forma_farmaceutica  VARCHAR(20)    NOT NULL
                        CHECK (forma_farmaceutica IN
                              ('Tableta', 'Cápsula', 'Jarabe', 'Suspensión',
                               'Crema', 'Gel', 'Inyectable', 'Gotas')),
    precio_unitario     NUMERIC(10,2)  NOT NULL CHECK (precio_unitario >= 0),
    tipo_venta          VARCHAR(15)    NOT NULL DEFAULT 'Libre'
                        CHECK (tipo_venta IN ('Libre', 'Con receta')),
    stock_seguridad     INT            NOT NULL DEFAULT 0 CHECK (stock_seguridad >= 0),
    dias_reposicion     INT            NOT NULL DEFAULT 0 CHECK (dias_reposicion >= 0),
    estado_medicamento  VARCHAR(10)    NOT NULL DEFAULT 'Activo'
                        CHECK (estado_medicamento IN ('Activo', 'Inactivo')),
    id_categoria        INT            NOT NULL REFERENCES categoria (id_categoria)
);

CREATE TABLE proveedor (
    id_proveedor       SERIAL        PRIMARY KEY,
    nombre_comercial   VARCHAR(100)  NOT NULL,
    ruc_nit            VARCHAR(20)   NOT NULL UNIQUE,
    telefono           VARCHAR(20),
    correo_electronico VARCHAR(120),
    direccion          VARCHAR(150)
);

-- fecha_recepcion y costo_unitario son atributos de la relación
-- Proveedor --Suministra(1:N)-- Lote, por eso viven en lote.
CREATE TABLE lote (
    id_lote           SERIAL         PRIMARY KEY,
    id_medicamento    INT            NOT NULL REFERENCES medicamento (id_medicamento),
    id_proveedor      INT            NOT NULL REFERENCES proveedor (id_proveedor),
    lote_numero       VARCHAR(40)    NOT NULL,
    fecha_recepcion   DATE           NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE           NOT NULL,
    costo_unitario    NUMERIC(10,2)  NOT NULL CHECK (costo_unitario >= 0),
    cantidad_stock    INT            NOT NULL CHECK (cantidad_stock >= 0),
    fecha_baja        DATE,
    UNIQUE (id_medicamento, lote_numero),
    CHECK (fecha_vencimiento > fecha_recepcion)
);

-- ---------------------------------------------------------------------
-- VENTAS: clientes, ventas, dispensa (relación N:M Venta-Lote) y comprobantes
-- La receta no se guarda: solo se valida en pantalla al vender
-- medicamentos con tipo_venta = 'Con receta'.
-- ---------------------------------------------------------------------
CREATE TABLE cliente (
    id_cliente          SERIAL        PRIMARY KEY,
    nombres             VARCHAR(80)   NOT NULL,
    apellido_paterno    VARCHAR(60),
    apellido_materno    VARCHAR(60),
    ci_nit              VARCHAR(20)   NOT NULL UNIQUE,
    telefono            VARCHAR(20),
    correo_electronico  VARCHAR(120),
    domicilio           VARCHAR(150)
);

CREATE TABLE venta (
    id_venta              SERIAL         PRIMARY KEY,
    id_cliente            INT            NOT NULL REFERENCES cliente (id_cliente),
    id_usuario            INT            NOT NULL REFERENCES usuario (id_usuario),
    fecha_hora_venta      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descuento_porcentaje  NUMERIC(5,2)   NOT NULL DEFAULT 0
                          CHECK (descuento_porcentaje BETWEEN 0 AND 100),
    monto_recibido        NUMERIC(10,2)  NOT NULL CHECK (monto_recibido >= 0)
);

-- Tabla de la relación Venta --Dispensa(N:M)[Cantidad, Precio_Venta]-- Lote
CREATE TABLE dispensa (
    id_dispensa   SERIAL         PRIMARY KEY,
    id_venta      INT            NOT NULL REFERENCES venta (id_venta),
    id_lote       INT            NOT NULL REFERENCES lote (id_lote),
    cantidad      INT            NOT NULL CHECK (cantidad > 0),
    precio_venta  NUMERIC(10,2)  NOT NULL CHECK (precio_venta >= 0),
    UNIQUE (id_venta, id_lote)
);

-- num_serie incluye el año (ej. NV-2026-000001) porque la numeración
-- se reinicia cada año y debe seguir siendo único.
CREATE TABLE comprobante_venta (
    id_comprobante    SERIAL       PRIMARY KEY,
    id_venta          INT          NOT NULL UNIQUE REFERENCES venta (id_venta),
    tipo_comprobante  VARCHAR(15)  NOT NULL
                      CHECK (tipo_comprobante IN ('Nota de venta', 'Factura')),
    num_serie         VARCHAR(30)  NOT NULL UNIQUE,
    fecha_emision     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    formato_impresion VARCHAR(10)  NOT NULL DEFAULT 'Pantalla'
                      CHECK (formato_impresion IN ('Pantalla', 'Impreso'))
);

-- ---------------------------------------------------------------------
-- AUDITORÍA: historial de operaciones (solo inserción)
-- id_registro apunta a la venta o al lote afectado según tipo_operacion
-- ---------------------------------------------------------------------
CREATE TABLE historial_operacion (
    id_historial    SERIAL       PRIMARY KEY,
    id_usuario      INT          NOT NULL REFERENCES usuario (id_usuario),
    tipo_operacion  VARCHAR(15)  NOT NULL
                    CHECK (tipo_operacion IN ('VENTA', 'RECEPCION', 'BAJA')),
    id_registro     INT          NOT NULL,
    fecha_hora      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);