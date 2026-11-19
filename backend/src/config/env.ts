import "dotenv/config";

/**
 * Lee una variable obligatoria del .env.
 * Si falta, detiene el servidor con un mensaje claro
 * (mejor fallar al arrancar que fallar a mitad de un pago).
 */
function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`❌ Falta la variable de entorno "${nombre}" en backend/.env`);
  }
  return valor;
}

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  API_URL: process.env.API_URL || "http://localhost:3000",
  
  // Correo (SMTP). Sin SMTP_HOST se usa una cuenta de prueba de Ethereal
  correo: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    remitente: process.env.CORREO_REMITENTE || "Mr.Boleta <no-responder@mrboleta.com>",
  },

  // Base de datos PostgreSQL (Neon)
  DATABASE_URL: requerida("DATABASE_URL"),

  // Auth0: para validar el token del usuario que inicia sesión con Google
  auth0: {
    domain: requerida("AUTH0_DOMAIN"),
    audience: requerida("AUTH0_AUDIENCE"),
  },

  // Pasarela de pagos: "mock" (simulada) o "mercadopago" (Checkout Pro)
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "mock",

  // Mercado Pago: el access token solo es obligatorio si PAYMENT_PROVIDER=mercadopago
  mercadopago: {
    apiUrl: process.env.MP_API_URL || "https://api.mercadopago.com",
    accessToken: (process.env.MP_ACCESS_TOKEN || "").trim(),
    // Opcional: si se configura, se valida la firma de los webhooks
    webhookSecret: (process.env.MP_WEBHOOK_SECRET || "").trim(),
  },
};

// Si se eligió Mercado Pago, su access token sí es obligatorio
if (env.PAYMENT_PROVIDER === "mercadopago") {
  requerida("MP_ACCESS_TOKEN");
}