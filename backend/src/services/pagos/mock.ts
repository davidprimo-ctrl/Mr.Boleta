import { env } from "../../config/env";
import type { PasarelaPago } from "./pasarela";

/** Pasarela simulada: una página propia con los botones Aprobar y Rechazar. */
export const pasarelaMock: PasarelaPago = {
  nombre: "mock",
  async iniciarPago(orden) {
    return { urlPago: `${env.API_URL}/api/pagos/mock/${orden.id}` };
  },
};