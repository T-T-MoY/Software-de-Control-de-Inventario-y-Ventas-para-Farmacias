export function coincidePorPrefijo(valor, consulta) {
  const termino = String(consulta || '').trim().toLocaleLowerCase()
  if (!termino) return true

  const palabras = String(valor || '')
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  const terminos = termino.split(/[^\p{L}\p{N}]+/u).filter(Boolean)

  return terminos.every((buscado) =>
    palabras.some((palabra) => palabra.startsWith(buscado))
  )
}
