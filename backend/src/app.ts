import express from "express";
import cors from "cors";

import { eventosRouter } from "./routes/eventos.routes";

const app = express();

app.use(cors());          // permite peticiones desde el frontend
app.use(express.json());  // permite recibir JSON en el body

// Ruta de prueba para saber si el servidor está vivo
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Mr.Boleta API" });
});

app.use("/api/eventos", eventosRouter);

export default app;