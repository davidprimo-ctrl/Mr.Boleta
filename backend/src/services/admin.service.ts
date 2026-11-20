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
  mapa?: string;
}

export interface DatosLocalidad {
  nombre: string;
  precio: number;
  aforo: number;
  zona?: string | null;
}

const conLocalidades = { localidades: { orderBy: { precio: "desc" } } } as const;

export interface ResumenEvento {
  id: number;
  nombre: string;
  fecha: Date;
  estado: EstadoEvento;
  ventas: number;
  ingresos: number;
  boletasVendidas: number;
  aforoTotal: number;
  cuposDisponibles: number;
}

/**
 * HU09: ventas, ingresos y cupos restantes.
 * Solo cuentan las órdenes APROBADAS: las pendientes, rechazadas y expiradas no son ventas.
 */
export async function obtenerResumen() {
  const [eventos, ordenes] = await Promise.all([
    prisma.evento.findMany({ include: { localidades: true }, orderBy: { fecha: "asc" } }),
    prisma.orden.findMany({
      where: { estado: "APROBADA" },
      select: {
        eventoId: true,
        total: true,
        detalles: { select: { cantidad: true, boletas: { select: { id: true } } } },
      },
    }),
  ]);

  const porEvento = new Map<number, { ventas: number; ingresos: number; boletasVendidas: number }>();
  for (const orden of ordenes) {
    const actual = porEvento.get(orden.eventoId) ?? { ventas: 0, ingresos: 0, boletasVendidas: 0 };
    actual.ventas += 1;
    actual.ingresos += Number(orden.total);
    actual.boletasVendidas += orden.detalles.reduce((suma, d) => suma + d.boletas.length, 0);
    porEvento.set(orden.eventoId, actual);
  }

  const detalle: ResumenEvento[] = eventos.map((evento) => ({
    id: evento.id,
    nombre: evento.nombre,
    fecha: evento.fecha,
    estado: evento.estado,
    ...(porEvento.get(evento.id) ?? { ventas: 0, ingresos: 0, boletasVendidas: 0 }),
    aforoTotal: evento.localidades.reduce((suma, l) => suma + l.aforo, 0),
    cuposDisponibles: evento.localidades.reduce((suma, l) => suma + l.cuposDisponibles, 0),
  }));

  return {
    totalVentas: ordenes.length,
    ingresos: ordenes.reduce((suma, o) => suma + Number(o.total), 0),
    boletasVendidas: detalle.reduce((suma, e) => suma + e.boletasVendidas, 0),
    aforoTotal: detalle.reduce((suma, e) => suma + e.aforoTotal, 0),
    cuposDisponibles: detalle.reduce((suma, e) => suma + e.cuposDisponibles, 0),
    eventos: detalle,
  };
}

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