import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errores";

/** Reglas de negocio */
export const MINUTOS_RESERVA = 10;
export const MAX_BOLETAS_POR_ORDEN = 10;

export interface ItemOrden {
  localidadId: number;
  cantidad: number;
}

/** Qué datos se devuelven junto con cada orden */
const incluirDetalle = {
  evento: { select: { id: true, nombre: true, fecha: true, lugar: true, ciudad: true } },
  detalles: { include: { localidad: { select: { id: true, nombre: true } }, boletas: true } },
} as const;

/**
 * Crea una orden PENDIENTE y reserva los cupos por 10 minutos.
 * Todo ocurre en una TRANSACCIÓN: si una sola localidad no tiene cupos,
 * no se reserva nada (todo o nada).
 */
export async function crearOrden(usuarioId: number, eventoId: number, items: ItemOrden[]) {
  const totalBoletas = items.reduce((suma, i) => suma + i.cantidad, 0);
  if (totalBoletas > MAX_BOLETAS_POR_ORDEN) {
    throw new HttpError(400, `Máximo ${MAX_BOLETAS_POR_ORDEN} boletas por orden`);
  }

  // Antes de revisar disponibilidad, liberar las reservas que ya vencieron
  await liberarOrdenesExpiradas();

  return prisma.$transaction(async (tx) => {
    const evento = await tx.evento.findFirst({ where: { id: eventoId, estado: "PUBLICADO" } });
    if (!evento) throw new HttpError(404, "Evento no encontrado o no disponible");
    if (evento.fecha < new Date()) throw new HttpError(409, "El evento ya ocurrió");

    let total = 0;
    const detalles = [];

    for (const { localidadId, cantidad } of items) {
      // Descuento CONDICIONAL: solo resta si alcanzan los cupos (evita la sobreventa)
      const { count } = await tx.localidad.updateMany({
        where: { id: localidadId, eventoId, cuposDisponibles: { gte: cantidad } },
        data: { cuposDisponibles: { decrement: cantidad } },
      });

      if (count === 0) {
        const localidad = await tx.localidad.findFirst({ where: { id: localidadId, eventoId } });
        if (!localidad) throw new HttpError(404, `La localidad ${localidadId} no pertenece al evento`);
        throw new HttpError(
          409,
          `No hay cupos suficientes en ${localidad.nombre} (quedan ${localidad.cuposDisponibles})`,
        );
      }

      const localidad = await tx.localidad.findUniqueOrThrow({ where: { id: localidadId } });
      const precio = Number(localidad.precio);
      total += precio * cantidad;
      detalles.push({ localidadId, cantidad, precioUnitario: precio, subtotal: precio * cantidad });
    }

    return tx.orden.create({
      data: {
        usuarioId,
        eventoId,
        total,
        expiraEn: new Date(Date.now() + MINUTOS_RESERVA * 60 * 1000),
        detalles: { create: detalles },
      },
      include: incluirDetalle,
    });
  });
}

/** Marca como EXPIRADAS las órdenes PENDIENTES vencidas y devuelve sus cupos. */
export async function liberarOrdenesExpiradas() {
  const vencidas = await prisma.orden.findMany({
    where: { estado: "PENDIENTE", expiraEn: { lt: new Date() } },
    select: { id: true },
  });

  for (const { id } of vencidas) {
    await prisma.$transaction(async (tx) => {
      // Solo si SIGUE pendiente (evita devolver los cupos dos veces)
      const { count } = await tx.orden.updateMany({
        where: { id, estado: "PENDIENTE" },
        data: { estado: "EXPIRADA" },
      });
      if (count === 0) return;

      const detalles = await tx.detalleOrden.findMany({ where: { ordenId: id } });
      for (const d of detalles) {
        await tx.localidad.update({
          where: { id: d.localidadId },
          data: { cuposDisponibles: { increment: d.cantidad } },
        });
      }
    });
  }

  return vencidas.length;
}

/** Una orden del usuario (404 si no existe o es de otra persona). */
export async function obtenerOrdenDeUsuario(ordenId: number, usuarioId: number) {
  const orden = await prisma.orden.findFirst({
    where: { id: ordenId, usuarioId },
    include: incluirDetalle,
  });
  if (!orden) throw new HttpError(404, "Orden no encontrada");
  return orden;
}

/** Todas las órdenes del usuario, de la más reciente a la más antigua. */
export function listarOrdenesDeUsuario(usuarioId: number) {
  return prisma.orden.findMany({
    where: { usuarioId },
    include: incluirDetalle,
    orderBy: { creadoEn: "desc" },
  });
}