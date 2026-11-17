import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errores";
import type { EstadoEvento } from "../generated/prisma/client";

export interface DatosEvento {
  nombre: string;
  descripcion: string;
  artista: string;
  lugar: string;
  ciudad: string;
  fecha: Date;
  imagenUrl?: string | null;
}

export interface DatosLocalidad {
  nombre: string;
  precio: number;
  aforo: number;
}

const conLocalidades = { localidades: { orderBy: { precio: "desc" } } } as const;

/** Todos los eventos, en cualquier estado (el catálogo público solo ve los publicados). */
export function listarEventos() {
  return prisma.evento.findMany({ include: conLocalidades, orderBy: { fecha: "asc" } });
}

export async function obtenerEvento(id: number) {
  const evento = await prisma.evento.findUnique({ where: { id }, include: conLocalidades });
  if (!evento) throw new HttpError(404, "Evento no encontrado");
  return evento;
}

/** Crea el evento en BORRADOR con sus localidades; los cupos disponibles empiezan igual al aforo. */
export function crearEvento(datos: DatosEvento, localidades: DatosLocalidad[]) {
  return prisma.evento.create({
    data: {
      ...datos,
      localidades: { create: localidades.map((l) => ({ ...l, cuposDisponibles: l.aforo })) },
    },
    include: conLocalidades,
  });
}

export async function actualizarEvento(id: number, datos: Partial<DatosEvento>) {
  await obtenerEvento(id);
  return prisma.evento.update({ where: { id }, data: datos, include: conLocalidades });
}

/** Publicar, volver a borrador o desactivar. No se borra: las órdenes y boletas vendidas se conservan. */
export async function cambiarEstado(id: number, estado: EstadoEvento) {
  const evento = await obtenerEvento(id);
  if (estado === "PUBLICADO" && evento.localidades.length === 0) {
    throw new HttpError(409, "No se puede publicar un evento sin localidades");
  }
  return prisma.evento.update({ where: { id }, data: { estado }, include: conLocalidades });
}

/** Un evento no puede tener dos localidades con el mismo nombre (sin importar mayúsculas). */
async function revisarNombreLibre(eventoId: number, nombre: string, excepto?: number) {
  const repetida = await prisma.localidad.findFirst({
    where: { eventoId, nombre: { equals: nombre, mode: "insensitive" }, id: { not: excepto } },
  });
  if (repetida) throw new HttpError(409, `El evento ya tiene una localidad llamada "${nombre}"`);
}

export async function agregarLocalidad(eventoId: number, datos: DatosLocalidad) {
  await obtenerEvento(eventoId);
  await revisarNombreLibre(eventoId, datos.nombre);
  return prisma.localidad.create({ data: { ...datos, eventoId, cuposDisponibles: datos.aforo } });
}

/**
 * Edita una localidad. Si cambia el aforo, los cupos disponibles se ajustan en la misma diferencia,
 * y nunca se puede bajar el aforo por debajo de lo ya vendido o reservado.
 */
export async function actualizarLocalidad(id: number, datos: Partial<DatosLocalidad>) {
  const actual = await prisma.localidad.findUnique({ where: { id } });
  if (!actual) throw new HttpError(404, "Localidad no encontrada");
  if (datos.nombre) await revisarNombreLibre(actual.eventoId, datos.nombre, id);

  let cuposDisponibles = actual.cuposDisponibles;
  if (datos.aforo !== undefined) {
    const ocupados = actual.aforo - actual.cuposDisponibles; // vendidos o reservados
    if (datos.aforo < ocupados) {
      throw new HttpError(409, `El aforo no puede ser menor a ${ocupados}: ya hay boletas vendidas o reservadas`);
    }
    cuposDisponibles = datos.aforo - ocupados;
  }
  return prisma.localidad.update({ where: { id }, data: { ...datos, cuposDisponibles } });
}