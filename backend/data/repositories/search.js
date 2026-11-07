const coincidePalabraPorPrefijo = (campo, parametro) => `EXISTS (
    SELECT 1
    WHERE NOT EXISTS (
        SELECT 1
        FROM regexp_split_to_table(
            COALESCE(${parametro}::text, ''),
            '[^[:alnum:]]+'
        ) AS consulta(termino)
        WHERE consulta.termino <> ''
          AND NOT EXISTS (
              SELECT 1
              FROM regexp_split_to_table(
                  COALESCE(${campo}, ''),
                  '[^[:alnum:]]+'
              ) AS valor(palabra)
              WHERE starts_with(lower(valor.palabra), lower(consulta.termino))
          )
    )
)`;

module.exports = { coincidePalabraPorPrefijo };
