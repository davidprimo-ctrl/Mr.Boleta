import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";
import { HttpError } from "../../lib/errores";
import { prisma } from "../../lib/prisma";
import { aprobarOrden, rechazarOrden } from "../pagos.service";
import type { PasarelaPago } from "./pasarela";

interface PreferenciaMP {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
}

export interface PagoMP {
  id: number;
  status: "approved" | "pending" | "in_process" | "rejected" | "cancelled" | "refunded" | "charged_back" | string;
  external_reference: string | null;
  transaction_amount?: number;
  payment_method_id?: string;
}

const TEXTO_TIMEOUT = 15_000;

async function leerError(respuesta: Response) {
  try {
    return (await respuesta.text()).slice(0, 400);
  } catch {
    return "";
  }
}

/** Checkout Pro: crea una preferencia y devuelve el enlace al checkout de Mercado Pago. */
export const pasarelaMercadoPago: PasarelaPago = {
  nombre: "mercadopago",
  async iniciarPago(orden) {
    const api = env.API_URL.replace(/\/+$/, "");
    const frontend = env.FRONTEND_URL.replace(/\/+$/, "");
    const volverA = `${frontend}/ordenes/${orden.id}`;

    const preferencia: Record<string, unknown> = {
      items: [
        {
          id: `orden-${orden.id}`,
          title: `Mr.Boleta · Orden #${orden.id}`,
          description: "Boletas para evento",
          quantity: 1,
          currency_id: "COP",
          unit_price: Number(orden.total),
        },
      ],
      external_reference: String(orden.id),
      statement_descriptor: "MRBOLETA",
      notification_url: `${api}/api/pagos/mercadopago/webhook`,
      back_urls: { success: volverA, pending: volverA, failure: volverA },
      metadata: { ordenId: orden.id },
    };

    // Mercado Pago solo acepta auto_return cuando la URL de éxito es HTTPS.
    if (volverA.startsWith("https://")) preferencia.auto_return = "approved";

    const respuesta = await fetch(`${env.mercadopago.apiUrl}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.mercadopago.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencia),
      signal: AbortSignal.timeout(TEXTO_TIMEOUT),
    });

    if (!respuesta.ok) {
      console.error("Mercado Pago rechazó la preferencia:", respuesta.status, await leerError(respuesta));
      throw new HttpError(502, "No se pudo iniciar el pago con Mercado Pago");
    }

    const datos = (await respuesta.json()) as PreferenciaMP;
    // Checkout Pro usa init_point también con credenciales de prueba: el entorno lo
    // determina la pestaña (Prueba/Producción) de donde se copió el token.
    const urlPago = datos.init_point ?? datos.sandbox_init_point;
    if (!urlPago) throw new HttpError(502, "Mercado Pago no devolvió la URL de pago");
    return { urlPago };
  },
};

/** Consulta un pago directamente a la API de Mercado Pago (fuente de verdad). */
export async function consultarPago(paymentId: string): Promise<PagoMP> {
  const respuesta = await fetch(`${env.mercadopago.apiUrl}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${env.mercadopago.accessToken}` },
    signal: AbortSignal.timeout(TEXTO_TIMEOUT),
  });

  if (respuesta.status === 404) throw new HttpError(404, "Pago no encontrado en Mercado Pago");
  if (!respuesta.ok) {
    console.error("Mercado Pago no permitió consultar el pago:", respuesta.status, await leerError(respuesta));
    throw new HttpError(502, "No se pudo consultar el pago en Mercado Pago");
  }
  return (await respuesta.json()) as PagoMP;
}

export type AccionPago = "aprobada" | "rechazada" | "pendiente" | "ignorada";

/**
 * Aplica a la orden el estado real del pago. Es idempotente: si el webhook y la
 * confirmación del navegador llegan a la vez, el segundo no duplica boletas.
 */
export async function procesarPagoMercadoPago(paymentId: string, usuarioId?: number) {
  const pago = await consultarPago(paymentId);
  const ordenId = Number(pago.external_reference);

  if (!Number.isInteger(ordenId) || ordenId <= 0) {
    return { ordenId: null, estadoPago: pago.status, accion: "ignorada" as AccionPago };
  }

  // Cuando lo llama el navegador, solo puede confirmar una orden propia.
  if (usuarioId !== undefined) {
    const orden = await prisma.orden.findFirst({ where: { id: ordenId, usuarioId } });
    if (!orden) throw new HttpError(404, "La orden no pertenece al usuario");
  }

  const referencia = `MP-${pago.id}`;
  let accion: AccionPago = "ignorada";

  try {
    if (pago.status === "approved") {
      await aprobarOrden(ordenId, referencia);
      accion = "aprobada";
    } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(pago.status)) {
      await rechazarOrden(ordenId, referencia);
      accion = "rechazada";
    } else {
      accion = "pendiente";
    }
  } catch (e) {
    // 409 = la orden ya no estaba pendiente (otro aviso llegó primero). No es un error.
    if (!(e instanceof HttpError && e.status === 409)) throw e;
    console.warn(`Pago ${paymentId}: la orden ${ordenId} ya había sido procesada`);
  }

  return { ordenId, estadoPago: pago.status, accion };
}

/**
 * Verifica la firma `x-signature` de Mercado Pago.
 * Si no hay MP_WEBHOOK_SECRET configurado, no se puede verificar y se deja pasar:
 * igual el estado real se consulta a la API con nuestro token.
 */
export function firmaWebhookValida(datos: {
  dataId: string;
  requestId: string | undefined;
  signature: string | undefined;
  secreto: string;
}) {
  if (!datos.secreto) return true;
  if (!datos.signature || !datos.requestId) return false;

  const partes = Object.fromEntries(
    datos.signature.split(",").map((parte) => {
      const [clave, ...resto] = parte.split("=");
      return [clave.trim(), resto.join("=").trim()];
    }),
  );
  if (!partes.ts || !partes.v1) return false;

  const manifiesto = `id:${datos.dataId};request-id:${datos.requestId};ts:${partes.ts};`;
  const esperado = createHmac("sha256", datos.secreto).update(manifiesto).digest("hex");
  const recibido = Buffer.from(partes.v1);
  const calculado = Buffer.from(esperado);
  return recibido.length === calculado.length && timingSafeEqual(recibido, calculado);
}
