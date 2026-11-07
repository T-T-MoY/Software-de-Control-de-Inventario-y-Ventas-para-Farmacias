import { readFileSync, writeFileSync } from 'node:fs'

/**
 * Sonar cuenta como "línea a cubrir" cada línea ejecutable, mientras que el
 * reporter lcov de Istanbul solo anota la línea donde empieza cada sentencia.
 * Una sentencia que ocupa varias líneas (un objeto, una función, un import
 * multilínea) deja el resto de sus líneas sin dato, y Sonar las marca como no
 * cubiertas.
 *
 * Este script regenera el lcov a partir de coverage-final.json:
 * - Expande cada sentencia a todas las líneas de su rango.
 * - Añade la cabecera de cada función (se ejecuta al cargar el módulo).
 * - Conserva las ramas y funciones que ya calculó Istanbul.
 * - Normaliza las rutas a frontend/src/... con barras inclinadas.
 */

const lcovPath = new URL('../coverage/lcov.info', import.meta.url)
const jsonPath = new URL('../coverage/coverage-final.json', import.meta.url)

const normalizar = (ruta) => ruta.replace(/\\/g, '/').replace(/^\.\/+/, '')

const cobertura = JSON.parse(readFileSync(jsonPath, 'utf8'))

// Índice por ruta relativa al proyecto: src/business/format.js
const porRuta = new Map()
for (const [clave, entrada] of Object.entries(cobertura)) {
  const ruta = normalizar(entrada.path || clave)
  const indice = ruta.lastIndexOf('/src/')
  const relativa = indice >= 0 ? ruta.slice(indice + 1) : ruta
  porRuta.set(relativa, entrada)
}

/** Líneas ejecutables con su número de ejecuciones. */
const lineasEjecutadas = (entrada) => {
  const lineas = new Map()
  const anotar = (linea, veces) => {
    if (!Number.isInteger(linea) || linea < 1) return
    lineas.set(linea, Math.max(lineas.get(linea) ?? 0, veces))
  }

  for (const [id, sentencia] of Object.entries(entrada.statementMap ?? {})) {
    const veces = entrada.s?.[id] ?? 0
    for (let linea = sentencia.start.line; linea <= sentencia.end.line; linea += 1) {
      anotar(linea, veces)
    }
  }

  // La cabecera de una función se ejecuta cuando se carga el módulo, aunque
  // la función nunca llegue a invocarse. El cuerpo ya lo cubren las
  // sentencias, así que no se expande aquí para no inflar la cobertura.
  const moduloCargado = Object.values(entrada.s ?? {}).some((veces) => veces > 0)
  for (const funcion of Object.values(entrada.fnMap ?? {})) {
    const desde = funcion.decl?.start?.line ?? funcion.loc?.start?.line
    const hasta = funcion.loc?.start?.line ?? desde
    for (let linea = desde; linea <= hasta; linea += 1) {
      anotar(linea, moduloCargado ? 1 : 0)
    }
  }

  return lineas
}

const bloques = []
let bloque = null

for (const linea of readFileSync(lcovPath, 'utf8').split(/\r?\n/)) {
  if (linea.startsWith('SF:')) {
    bloque = { sf: linea.slice(3), lineas: [] }
  } else if (linea === 'end_of_record') {
    if (bloque) bloques.push(bloque)
    bloque = null
  } else if (bloque && linea) {
    bloque.lineas.push(linea)
  }
}

const salida = []

for (const { sf, lineas } of bloques) {
  const relativa = normalizar(sf)
  const entrada = porRuta.get(relativa)
  const rutaSonar = relativa.startsWith('frontend/')
    ? relativa
    : `frontend/${relativa}`

  salida.push(`SF:${rutaSonar}`)

  // Se conservan funciones y ramas; las líneas se recalculan.
  for (const linea of lineas) {
    if (/^(DA|LF|LH):/.test(linea)) continue
    salida.push(linea)
  }

  if (entrada) {
    const ejecutadas = lineasEjecutadas(entrada)
    const ordenadas = [...ejecutadas.keys()].sort((a, b) => a - b)
    const cubiertas = ordenadas.filter((linea) => ejecutadas.get(linea) > 0)

    for (const linea of ordenadas) {
      salida.push(`DA:${linea},${ejecutadas.get(linea)}`)
    }
    salida.push(`LF:${ordenadas.length}`)
    salida.push(`LH:${cubiertas.length}`)
  } else {
    // Sin datos de Istanbul se respeta el bloque original.
    for (const linea of lineas) {
      if (/^(DA|LF|LH):/.test(linea)) salida.push(linea)
    }
  }

  salida.push('end_of_record')
}

writeFileSync(lcovPath, `${salida.join('\n')}\n`)
