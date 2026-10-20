/** Contrato que cumple cualquier pasarela de pagos (patrón Adaptador / Strategy). */
export interface PasarelaPago {
  nombre: string;
  /** Devuelve la URL a la que se envía al comprador para pagar. */
  iniciarPago(orden: { id: number; total: number }): Promise<{ urlPago: string }>;
}