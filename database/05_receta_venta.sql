-- 05_receta_venta.sql
-- Migración: guardar los datos de la receta en la venta (RD5).
--
-- Se ejecuta después de 04_configuracion.sql (orden alfabético) y conserva
-- las ventas existentes: las columnas son opcionales y el CHECK solo exige
-- que, si se registra una receta, estén los tres datos.
--
--   paciente  -> nombre del paciente de la receta
--   medico    -> nombre del médico que la emitió
--   matricula -> matrícula profesional del médico

ALTER TABLE venta
    ADD COLUMN IF NOT EXISTS paciente  VARCHAR(160),
    ADD COLUMN IF NOT EXISTS medico    VARCHAR(160),
    ADD COLUMN IF NOT EXISTS matricula VARCHAR(40);

ALTER TABLE venta
    DROP CONSTRAINT IF EXISTS venta_receta_completa;

ALTER TABLE venta
    ADD CONSTRAINT venta_receta_completa CHECK (
        (paciente IS NULL AND medico IS NULL AND matricula IS NULL)
        OR (paciente IS NOT NULL AND medico IS NOT NULL AND matricula IS NOT NULL)
    );
