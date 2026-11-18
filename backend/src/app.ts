import express, { type ErrorRequestHandler } from "express";
import { usuariosRouter } from "./routes/usuarios.routes";
import { ordenesRouter } from "./routes/ordenes.routes";
import { pagosRouter } from "./routes/pagos.routes";
import { adminRouter } from "./routes/admin.routes";
import { requiereAuth, requiereAdmin } from "./middlewares/auth";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { documentoOpenApi } from "./docs/openapi";

import { eventosRouter } from "./routes/eventos.routes";

const app = express();

app.use(cors());          // permite peticiones desde el frontend
app.use(express.json());  // permite recibir JSON en el body

// Documentación interactiva de la API (Swagger UI)
app.get("/api/docs.json", (_req, res) => {
    res.json(documentoOpenApi);
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(documentoOpenApi, { customSiteTitle: "Mr.Boleta API" }));
app.get("/", (_req, res) => {
    res.redirect("/api/docs");
});

// Ruta de prueba para saber si el servidor está vivo
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Mr.Boleta API" });
});

app.use("/api/eventos", eventosRouter);

// Rutas que requieren sesión iniciada
app.use("/api/usuarios", requiereAuth, usuariosRouter);
app.use("/api/ordenes", requiereAuth, ordenesRouter);

app.use("/api/admin", requiereAuth, requiereAdmin, adminRouter);

app.use("/api/pagos", pagosRouter); // la autenticación se aplica adentro, solo donde hace falta


// Manejo de errores: siempre responder en JSON (ej. token inválido → 401)
const manejarErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err.status === "number" ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? "Error interno del servidor" : err.message });
};
app.use(manejarErrores);



export default app;