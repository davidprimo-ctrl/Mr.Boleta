import express, { type ErrorRequestHandler } from "express";
import { usuariosRouter } from "./routes/usuarios.routes";
import { ordenesRouter } from "./routes/ordenes.routes";
import { pagosRouter } from "./routes/pagos.routes";
import { requiereAuth } from "./middlewares/auth";
import cors from "cors";

import { eventosRouter } from "./routes/eventos.routes";

const app = express();

app.use(cors());          // permite peticiones desde el frontend
app.use(express.json());  // permite recibir JSON en el body

// Ruta de prueba para saber si el servidor está vivo
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Mr.Boleta API" });
});

// Rutas que requieren sesión iniciada
app.use("/api/usuarios", requiereAuth, usuariosRouter);
app.use("/api/ordenes", requiereAuth, ordenesRouter);

app.use("/api/pagos", pagosRouter); // la autenticación se aplica adentro, solo donde hace falta


// Manejo de errores: siempre responder en JSON (ej. token inválido → 401)
const manejarErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err.status === "number" ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? "Error interno del servidor" : err.message });
};
app.use(manejarErrores);

app.use("/api/eventos", eventosRouter);

export default app;