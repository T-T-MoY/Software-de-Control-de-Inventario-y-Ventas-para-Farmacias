-- =====================================================================
-- 03_historial_inmutable.sql
-- RF6 / CP-07: el historial de operaciones es de solo inserción.
-- Impide UPDATE, DELETE y TRUNCATE sobre historial_operacion, aunque
-- alguien con acceso a la base lo intente por fuera de la API.
-- Corre después de 01_init.sql y 02_inserts.sql (orden alfabético).
-- =====================================================================

CREATE OR REPLACE FUNCTION bloquear_modificacion_historial()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'El historial de operaciones es de solo lectura (operación % no permitida).',
        TG_OP
        USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_historial_sin_update_delete
    BEFORE UPDATE OR DELETE ON historial_operacion
    FOR EACH ROW
    EXECUTE FUNCTION bloquear_modificacion_historial();

CREATE TRIGGER trg_historial_sin_truncate
    BEFORE TRUNCATE ON historial_operacion
    FOR EACH STATEMENT
    EXECUTE FUNCTION bloquear_modificacion_historial();
