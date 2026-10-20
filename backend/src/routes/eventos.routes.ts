import { Router } from "express";
import { prisma } from "../lib/prisma";

export const eventosRouter = Router();

// GET /api/eventos?q=rock → eventos publicados y futuros, con búsqueda opcional
eventosRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const eventos = await prisma.evento.findMany({
    where: {
      estado: "PUBLICADO",
      fecha: { gte: new Date() }, // no mostrar eventos que ya pasaron
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { artista: { contains: q, mode: "insensitive" } },
              { ciudad: { contains: q, mode: "insensitive" } },
              { lugar: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { localidades: { orderBy: { precio: "asc" } } },
    orderBy: { fecha: "asc" },
  });

  res.json(eventos);
});

// GET /api/eventos/:id → detalle de un evento publicado
eventosRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "El id debe ser un número entero positivo" });
    return;
  }

  const evento = await prisma.evento.findFirst({
    where: { id, estado: "PUBLICADO" },
    include: { localidades: { orderBy: { precio: "asc" } } },
  });

  if (!evento) {
    res.status(404).json({ error: "Evento no encontrado" });
    return;
  }

  res.json(evento);
});