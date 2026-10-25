-- Procesos compartidos por el inventario y las ventas.

CREATE OR REPLACE FUNCTION actualizar_stock_detalle_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        IF EXISTS (
            SELECT 1
            FROM venta
            WHERE id_venta = OLD.id_venta
              AND estado_venta = 'Anulada'
        ) THEN
            RAISE EXCEPTION 'No se pueden modificar los detalles de una venta anulada'
                USING ERRCODE = '23514';
        END IF;

        UPDATE lote
        SET cantidad_stock = cantidad_stock + OLD.cantidad
        WHERE id_lote = OLD.id_lote;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NOT EXISTS (
            SELECT 1
            FROM venta
            WHERE id_venta = NEW.id_venta
              AND estado_venta = 'Completada'
        ) THEN
            RAISE EXCEPTION 'Solo se pueden agregar detalles a una venta completada'
                USING ERRCODE = '23514';
        END IF;

        UPDATE lote
        SET cantidad_stock = cantidad_stock - NEW.cantidad
        WHERE id_lote = NEW.id_lote
          AND cantidad_stock >= NEW.cantidad
          AND fecha_vencimiento >= CURRENT_DATE
          AND fecha_baja IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'El lote no existe, está vencido, fue dado de baja o no tiene stock suficiente'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detalle_venta_actualizar_stock
AFTER INSERT OR UPDATE OR DELETE ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_detalle_venta();

CREATE OR REPLACE FUNCTION registrar_historial_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO historial_operacion (id_usuario, tipo_operacion, id_registro)
    VALUES (NEW.id_usuario, 'VENTA', NEW.id_venta);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_venta_historial
AFTER INSERT ON venta
FOR EACH ROW
EXECUTE FUNCTION registrar_historial_venta();

CREATE OR REPLACE FUNCTION actualizar_stock_estado_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    detalle RECORD;
BEGIN
    IF OLD.estado_venta <> NEW.estado_venta
       AND NEW.estado_venta = 'Anulada' THEN
        UPDATE lote AS l
        SET cantidad_stock = l.cantidad_stock + dv.cantidad
        FROM detalle_venta AS dv
        WHERE dv.id_venta = NEW.id_venta
          AND l.id_lote = dv.id_lote;

    ELSIF OLD.estado_venta <> NEW.estado_venta
       AND NEW.estado_venta = 'Completada' THEN
        FOR detalle IN
            SELECT id_lote, cantidad
            FROM detalle_venta
            WHERE id_venta = NEW.id_venta
        LOOP
            UPDATE lote
            SET cantidad_stock = cantidad_stock - detalle.cantidad
            WHERE id_lote = detalle.id_lote
              AND cantidad_stock >= detalle.cantidad
              AND fecha_vencimiento >= CURRENT_DATE
              AND fecha_baja IS NULL;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'No se puede reactivar la venta: un lote no tiene stock disponible o está vencido'
                    USING ERRCODE = '23514';
            END IF;
        END LOOP;
    END IF;

    IF OLD.estado_venta <> NEW.estado_venta THEN
        INSERT INTO historial_operacion (id_usuario, tipo_operacion, id_registro)
        VALUES (NEW.id_usuario, 'VENTA', NEW.id_venta);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_venta_anulada_restituir_stock
AFTER UPDATE OF estado_venta ON venta
FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_estado_venta();

CREATE OR REPLACE VIEW vw_stock_medicamento AS
SELECT
    m.id_medicamento,
    m.codigo_barras,
    m.nombre_comercial,
    m.dci,
    COALESCE(SUM(l.cantidad_stock) FILTER (
        WHERE l.fecha_vencimiento >= CURRENT_DATE AND l.fecha_baja IS NULL
    ), 0)::BIGINT AS stock_disponible,
    m.stock_seguridad,
    COALESCE(SUM(l.cantidad_stock) FILTER (
        WHERE l.fecha_vencimiento >= CURRENT_DATE AND l.fecha_baja IS NULL
    ), 0) <= m.stock_seguridad AS requiere_reposicion
FROM medicamento AS m
LEFT JOIN lote AS l ON l.id_medicamento = m.id_medicamento
GROUP BY m.id_medicamento;

CREATE OR REPLACE VIEW vw_lotes_por_vencer AS
SELECT
    l.id_lote,
    l.id_medicamento,
    m.nombre_comercial,
    l.lote_numero,
    l.fecha_vencimiento,
    l.cantidad_stock,
    l.fecha_vencimiento - CURRENT_DATE AS dias_para_vencer
FROM lote AS l
JOIN medicamento AS m ON m.id_medicamento = l.id_medicamento
WHERE l.cantidad_stock > 0
  AND l.fecha_baja IS NULL
  AND l.fecha_vencimiento >= CURRENT_DATE
  AND l.fecha_vencimiento <= CURRENT_DATE + COALESCE(
      (SELECT valor::INT
       FROM parametro_sistema
       WHERE nombre_parametro = 'margen_alerta_dias'),
      30
  );
