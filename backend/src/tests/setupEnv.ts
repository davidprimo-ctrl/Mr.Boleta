/**
 * Se ejecuta ANTES de importar la app. env.ts exige estas variables al arrancar,
 * pero las pruebas no deben depender de un .env real ni de servicios externos.
 */
process.env.DATABASE_URL ||= "postgresql://usuario:clave@localhost:5432/mrboleta";
process.env.AUTH0_DOMAIN ||= "ejemplo.us.auth0.com";
process.env.AUTH0_AUDIENCE ||= "https://api.mrboleta.test";
process.env.API_URL ||= "http://localhost:3000";
process.env.FRONTEND_URL ||= "http://localhost:5173";
process.env.PAYMENT_PROVIDER ||= "mock";
// Token ficticio para probar el adaptador de Mercado Pago sin red ni credenciales reales.
process.env.MP_ACCESS_TOKEN ||= "TEST-token-de-prueba";
process.env.MP_WEBHOOK_SECRET ||= "";
