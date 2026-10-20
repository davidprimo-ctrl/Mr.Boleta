import { Router } from "express";
import * as ordenes from "../services/ordenes.service";
import { HttpError } from "../lib/errores";

export const ordenesRouter = Router();

/** Revisa que el body tenga la forma { eventoId, items: [{ localidadId, cantidad }] } */
function validarOrden(body: unknown) {
  const { eventoId, items } = (body ?? {}) as { eventoId?: unknown; items?: unknown };
  const itemsValidos =
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (i) => Number.isInteger(i?.localidadId) && Number.isInteger(i?.cantidad) && i.cantidad > 0,
    );

  if (!Number.isInteger(eventoId) || !itemsValidos) {
    throw new HttpError(
      400,
      "Datos inválidos: se espera { eventoId, items: [{ localidadId, cantidad }] }",
    );
  }
  return { eventoId: eventoId as number, items: items as ordenes.ItemOrden[] };
}

// POST /api/ordenes → crea la orden y reserva los cupos por 10 minutos
ordenesRouter.post("/", async (req, res) => {
  const { eventoId, items } = validarOrden(req.body);
  const orden = await ordenes.crearOrden(req.usuario!.id, eventoId, items);
  res.status(201).json(orden);
});

// GET /api/ordenes → mis órdenes
ordenesRouter.get("/", async (req, res) => {
  res.json(await ordenes.listarOrdenesDeUsuario(req.usuario!.id));
});

// GET /api/ordenes/:id → una de mis órdenes
ordenesRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Id inválido");
  res.json(await ordenes.obtenerOrdenDeUsuario(id, req.usuario!.id));
});