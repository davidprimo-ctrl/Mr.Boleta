import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errores";

/**
 * Pago APROBADO: la orden pasa a APROBADA y se crea una boleta
 * con un código QR único por cada entrada comprada.
 */
export async function aprobarOrden(ordenId: number, referenciaPago: string) {
  return prisma.$transaction(async (tx) => {
    const orden = await tx.orden.findUnique({ where: { id: ordenId }, include: { detalles: true } });
    if (!orden) throw new HttpError(404, "Orden no encontrada");
    if (orden.estado === "APROBADA") return; // el aviso de pago puede llegar repetido
    if (orden.expiraEn < new Date()) throw new HttpError(409, "La reserva ya venció");

    // Solo si SIGUE pendiente (evita choques con la expiración automática)
    const { count } = await tx.orden.updateMany({
      where: { id: ordenId, estado: "PENDIENTE" },
      data: { estado: "APROBADA", referenciaPago },
    });
    if (count === 0) throw new HttpError(409, "La orden ya no está pendiente");

    for (const detalle of orden.detalles) {
      await tx.boleta.createMany({
        data: Array.from({ length: detalle.cantidad }, () => ({
          detalleOrdenId: detalle.id,
          codigoQr: randomUUID(), // ej: "3f8a2c1e-9b7d-4e5f-a1b2-c3d4e5f6a7b8"
        })),
      });
    }
  });
}

/** Pago RECHAZADO: la orden pasa a RECHAZADA y los cupos vuelven a estar disponibles. */
export async function rechazarOrden(ordenId: number, referenciaPago: string) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.orden.updateMany({
      where: { id: ordenId, estado: "PENDIENTE" },
      data: { estado: "RECHAZADA", referenciaPago },
    });
    if (count === 0) throw new HttpError(409, "La orden ya no está pendiente");

    const detalles = await tx.detalleOrden.findMany({ where: { ordenId } });
    for (const d of detalles) {
      await tx.localidad.update({
        where: { id: d.localidadId },
        data: { cuposDisponibles: { increment: d.cantidad } },
      });
    }
  });
}