import { env } from "../../config/env";
import { pasarelaMercadoPago } from "./mercadopago";
import { pasarelaMock } from "./mock";

/** La pasarela activa: se cambia con PAYMENT_PROVIDER en el .env, sin tocar código. */
export const pasarela = env.PAYMENT_PROVIDER === "mercadopago" ? pasarelaMercadoPago : pasarelaMock;
