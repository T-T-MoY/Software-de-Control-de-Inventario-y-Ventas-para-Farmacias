-- ---------------------------------------------------------------------
-- Migración: parámetros generales editables desde la pantalla de
-- Configuración. Es idempotente para bases ya creadas.
--
-- Las claves ausentes se resuelven con los valores de .env; esta tabla
-- solo guarda lo que el Administrador cambió explícitamente.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
    clave        VARCHAR(60)  PRIMARY KEY,
    valor        TEXT,
    actualizado  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
