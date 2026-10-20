/** 80000 → "$ 80.000" (pesos colombianos) */
export function formatoCOP(valor: number | string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor));
}

/** "2026-11-09T01:00:00Z" → "domingo, 8 de noviembre de 2026, 8:00 p. m." */
export function formatoFecha(fechaIso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(fechaIso));
}