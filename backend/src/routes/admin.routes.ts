import { Router } from "express";
import { HttpError } from "../lib/errores";
import * as admin from "../services/admin.service";

export const adminRouter = Router();

type Cuerpo = Record<string, unknown>;

// ─────────── Validaciones ───────────

function leerId(valor: string) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Id inválido");
  return id;
}

function texto(body: Cuerpo, campo: string) {
  const valor = body[campo];
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new HttpError(400, `"${campo}" es obligatorio`);
  }
  return valor.trim();
}

function numeroPositivo(body: Cuerpo, campo: string, entero = false) {
  const valor = body[campo];
  if (typeof valor !== "number" || valor <= 0 || (entero && !Number.isInteger(valor))) {
    throw new HttpError(400, `"${campo}" debe ser un número ${entero ? "entero " : ""}mayor que 0`);
  }
  return valor;
}

function fecha(body: Cuerpo, campo: string) {
  const valor = body[campo];
  const f = typeof valor === "string" ? new Date(valor) : null;
  if (!f || Number.isNaN(f.getTime())) {
    throw new HttpError(400, `"${campo}" debe ser una fecha válida, ej. "2026-12-20T20:00:00-05:00"`);
  }
  return f;
}

/** Con parcial=true (al editar) solo valida los campos que vengan en el body. */
function leerEvento(body: Cuerpo, parcial: boolean) {
  const datos: Partial<admin.DatosEvento> = {};
  for (const campo of ["nombre", "descripcion", "artista", "lugar", "ciudad"] as const) {
    if (!parcial || campo in body) datos[campo] = texto(body, campo);
  }
  if (!parcial || "fecha" in body) datos.fecha = fecha(body, "fecha");
  if ("imagenUrl" in body) {
    datos.imagenUrl = body.imagenUrl === null || body.imagenUrl === "" ? null : texto(body, "imagenUrl");
  }
  return datos;
}

function leerLocalidad(body: Cuerpo, parcial: boolean) {
  const datos: Partial<admin.DatosLocalidad> = {};
  if (!parcial || "nombre" in body) datos.nombre = texto(body, "nombre");
  if (!parcial || "precio" in body) datos.precio = numeroPositivo(body, "precio");
  if (!parcial || "aforo" in body) datos.aforo = numeroPositivo(body, "aforo", true);
  return datos;
}

const cuerpo = (body: unknown) => (body ?? {}) as Cuerpo;

// ─────────── Rutas ───────────

// GET /api/admin/resumen → ventas, ingresos y cupos restantes por evento (HU09)
adminRouter.get("/resumen", async (_req, res) => {
  res.json(await admin.obtenerResumen());
});

// GET /api/admin/eventos → todos los eventos
adminRouter.get("/eventos", async (_req, res) => {
  res.json(await admin.listarEventos());
});

// GET /api/admin/eventos/:id
adminRouter.get("/eventos/:id", async (req, res) => {
  res.json(await admin.obtenerEvento(leerId(req.params.id)));
});

// POST /api/admin/eventos → crea un evento (BORRADOR) con sus localidades
adminRouter.post("/eventos", async (req, res) => {
  const body = cuerpo(req.body);
  const datos = leerEvento(body, false) as admin.DatosEvento;

  if (!Array.isArray(body.localidades) || body.localidades.length === 0) {
    throw new HttpError(400, "El evento debe tener al menos una localidad");
  }
  const localidades = body.localidades.map(
    (l) => leerLocalidad(cuerpo(l), false) as admin.DatosLocalidad,
  );
  const nombres = localidades.map((l) => l.nombre.toLowerCase());
  if (new Set(nombres).size !== nombres.length) {
    throw new HttpError(400, "Hay localidades con el mismo nombre");
  }

  res.status(201).json(await admin.crearEvento(datos, localidades));
});

// PUT /api/admin/eventos/:id → edita solo los campos enviados
adminRouter.put("/eventos/:id", async (req, res) => {
  res.json(await admin.actualizarEvento(leerId(req.params.id), leerEvento(cuerpo(req.body), true)));
});

// PATCH /api/admin/eventos/:id/estado → { "estado": "PUBLICADO" | "BORRADOR" | "INACTIVO" }
adminRouter.patch("/eventos/:id/estado", async (req, res) => {
  const { estado } = cuerpo(req.body);
  if (estado !== "BORRADOR" && estado !== "PUBLICADO" && estado !== "INACTIVO") {
    throw new HttpError(400, 'El estado debe ser "BORRADOR", "PUBLICADO" o "INACTIVO"');
  }
  res.json(await admin.cambiarEstado(leerId(req.params.id), estado));
});

// POST /api/admin/eventos/:id/localidades → agrega una localidad
adminRouter.post("/eventos/:id/localidades", async (req, res) => {
  const datos = leerLocalidad(cuerpo(req.body), false) as admin.DatosLocalidad;
  res.status(201).json(await admin.agregarLocalidad(leerId(req.params.id), datos));
});

// PUT /api/admin/localidades/:id → edita nombre, precio y/o aforo
adminRouter.put("/localidades/:id", async (req, res) => {
  res.json(await admin.actualizarLocalidad(leerId(req.params.id), leerLocalidad(cuerpo(req.body), true)));
});