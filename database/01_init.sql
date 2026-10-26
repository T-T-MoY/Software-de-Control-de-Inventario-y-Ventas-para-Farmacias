-- =====================================================================
-- 01_init.sql
-- Software de Control de Inventario y Ventas para Farmacias
-- Creación de tablas (PostgreSQL)
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
    nombre            VARCHAR(80)   NOT NULL,
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
-- CONFIGURACIÓN
-- ---------------------------------------------------------------------
CREATE TABLE parametro_sistema (
    id_parametro      SERIAL        PRIMARY KEY,
    nombre_parametro  VARCHAR(60)   NOT NULL UNIQUE,
    valor             VARCHAR(100)  NOT NULL
);

-- ---------------------------------------------------------------------
-- INVENTARIO: catálogos, medicamentos, proveedores y lotes
-- ---------------------------------------------------------------------
CREATE TABLE categoria (
    id_categoria      SERIAL        PRIMARY KEY,
    nombre_categoria  VARCHAR(60)   NOT NULL UNIQUE
);

CREATE TABLE forma_farmaceutica (
    id_forma      SERIAL        PRIMARY KEY,
    nombre_forma  VARCHAR(40)   NOT NULL UNIQUE
);

CREATE TABLE medicamento (
    id_medicamento   SERIAL         PRIMARY KEY,
    codigo_barras    VARCHAR(20)    NOT NULL UNIQUE,
    nombre_comercial VARCHAR(100)   NOT NULL,
    dci              VARCHAR(100)   NOT NULL,
    concentracion    VARCHAR(40)    NOT NULL,
    precio_unitario  NUMERIC(10,2)  NOT NULL CHECK (precio_unitario >= 0),
    tipo_venta       VARCHAR(15)    NOT NULL DEFAULT 'Libre'
                     CHECK (tipo_venta IN ('Libre', 'Con receta')),
    stock_seguridad  INT            NOT NULL DEFAULT 0 CHECK (stock_seguridad >= 0),
    dias_reposicion  INT            NOT NULL DEFAULT 0 CHECK (dias_reposicion >= 0),
    id_categoria     INT            NOT NULL REFERENCES categoria (id_categoria),
    id_forma         INT            NOT NULL REFERENCES forma_farmaceutica (id_forma)
);

CREATE TABLE proveedor (
    id_proveedor       SERIAL        PRIMARY KEY,
    nombre_comercial   VARCHAR(100)  NOT NULL,
    ruc_nit            VARCHAR(20)   NOT NULL UNIQUE,
    telefono           VARCHAR(20),
    correo_electronico VARCHAR(120),
    direccion          VARCHAR(150)
);

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
-- PERSONAS: generalización (Persona -> Cliente, Medico)
-- El paciente no tiene tabla propia: es una Persona a la que apunta
-- venta.id_paciente.
-- ---------------------------------------------------------------------
CREATE TABLE persona (
    id_persona       SERIAL        PRIMARY KEY,
    nombre_completo  VARCHAR(150)  NOT NULL,
    ci_nit           VARCHAR(20)   NOT NULL UNIQUE
);

CREATE TABLE cliente (
    id_cliente          INT           PRIMARY KEY REFERENCES persona (id_persona),
    telefono            VARCHAR(20),
    correo_electronico  VARCHAR(120),
    domicilio           VARCHAR(150)
);

CREATE TABLE medico (
    id_medico   INT           PRIMARY KEY REFERENCES persona (id_persona),
    matricula   VARCHAR(30)   NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- VENTAS: ventas, detalle y comprobantes
-- ---------------------------------------------------------------------
CREATE TABLE venta (
    id_venta              SERIAL         PRIMARY KEY,
    id_cliente            INT            NOT NULL REFERENCES cliente (id_cliente),
    id_usuario            INT            NOT NULL REFERENCES usuario (id_usuario),
    id_paciente           INT            REFERENCES persona (id_persona),
    id_medico             INT            REFERENCES medico (id_medico),
    fecha_hora_venta      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descuento_porcentaje  NUMERIC(5,2)   NOT NULL DEFAULT 0
                          CHECK (descuento_porcentaje BETWEEN 0 AND 100),
    monto_recibido        NUMERIC(10,2)  NOT NULL CHECK (monto_recibido >= 0),
    -- paciente y médico van juntos: ambos con valor (venta con receta) o ambos NULL
    CHECK ((id_paciente IS NULL) = (id_medico IS NULL))
);

CREATE TABLE detalle_venta (
    id_detalle    SERIAL         PRIMARY KEY,
    id_venta      INT            NOT NULL REFERENCES venta (id_venta),
    id_lote       INT            NOT NULL REFERENCES lote (id_lote),
    cantidad      INT            NOT NULL CHECK (cantidad > 0),
    precio_venta  NUMERIC(10,2)  NOT NULL CHECK (precio_venta >= 0),
    UNIQUE (id_venta, id_lote)
);

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

-- ---------------------------------------------------------------------
-- ÍNDICES para las búsquedas frecuentes (RF2, RF4, RNF3)
-- ---------------------------------------------------------------------
CREATE INDEX idx_medicamento_nombre   ON medicamento (nombre_comercial);
CREATE INDEX idx_medicamento_dci      ON medicamento (dci);
CREATE INDEX idx_lote_medicamento     ON lote (id_medicamento);
CREATE INDEX idx_lote_vencimiento     ON lote (fecha_vencimiento);
CREATE INDEX idx_venta_fecha          ON venta (fecha_hora_venta);
CREATE INDEX idx_detalle_venta_venta  ON detalle_venta (id_venta);
CREATE INDEX idx_historial_fecha      ON historial_operacion (fecha_hora);