import { createHash } from "node:crypto";
import { env } from "../../config/env";
import type { PasarelaPago } from "./pasarela";

/** Wompi (checkout web). Se activa con PAYMENT_PROVIDER=wompi y sus llaves de prueba. */
export const pasarelaWompi: PasarelaPago = {
  nombre: "wompi",
  async iniciarPago(orden) {
    const referencia = `MRB-${orden.id}-${Date.now()}`;
    const centavos = Math.round(orden.total * 100);

    // Firma de integridad que exige Wompi: SHA256(referencia + monto en centavos + moneda + secreto)
    const firma = createHash("sha256")
      .update(`${referencia}${centavos}COP${env.wompi.integritySecret}`)
      .digest("hex");

    const parametros = new URLSearchParams({
      "public-key": env.wompi.publicKey,
      currency: "COP",
      "amount-in-cents": String(centavos),
      reference: referencia,
      "signature:integrity": firma,
      "redirect-url": `${env.FRONTEND_URL}/ordenes/${orden.id}`,
    });
    return { urlPago: `https://checkout.wompi.co/p/?${parametros}` };
  },
};