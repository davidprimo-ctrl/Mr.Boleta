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

  // Base de datos PostgreSQL (Neon)
  DATABASE_URL: requerida("DATABASE_URL"),

  // Auth0: para validar el token del usuario que inicia sesión con Google
  auth0: {
    domain: requerida("AUTH0_DOMAIN"),
    audience: requerida("AUTH0_AUDIENCE"),
  },

  // Pasarela de pagos: "mock" (simulada) o "wompi" (sandbox real)
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "mock",

  // Wompi: solo es obligatorio si PAYMENT_PROVIDER=wompi
  wompi: {
    apiUrl: process.env.WOMPI_API_URL || "https://sandbox.wompi.co/v1",
    publicKey: process.env.WOMPI_PUBLIC_KEY || "",
    privateKey: process.env.WOMPI_PRIVATE_KEY || "",
    eventsSecret: process.env.WOMPI_EVENTS_SECRET || "",
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET || "",
  },
};

// Si se eligió Wompi, sus llaves sí son obligatorias
if (env.PAYMENT_PROVIDER === "wompi") {
  requerida("WOMPI_PUBLIC_KEY");
  requerida("WOMPI_PRIVATE_KEY");
  requerida("WOMPI_EVENTS_SECRET");
  requerida("WOMPI_INTEGRITY_SECRET");
}