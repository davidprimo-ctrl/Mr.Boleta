import { env } from "../../config/env";
import { pasarelaMock } from "./mock";
import { pasarelaWompi } from "./wompi";

/** La pasarela activa: se cambia con PAYMENT_PROVIDER en el .env, sin tocar código. */
export const pasarela = env.PAYMENT_PROVIDER === "wompi" ? pasarelaWompi : pasarelaMock;