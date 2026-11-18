import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errores";

/** Datos que se muestran al administrador cuando valida una boleta en la entrada. */
export interface BoletaValidada {
  id: number;
  codigoQr: string;
  estado: "USADA";
  evento: { id: number; nombre: string; fecha: Date; lugar: string; ciudad: string };
  localidad: string;
  comprador: { nombre: string; email: string };
  orden: { id: number; total: number; referenciaPago: string | null };
  validadaEn: string;
}

/**
 * Check-in de una boleta: la marca como USADA y devuelve sus datos.
 * El cambio se hace con updateMany condicional (estado ACTIVA) para que dos
 * escaneos simultáneos no puedan marcar la misma boleta dos veces.
 */
export async function validarBoleta(codigoQr: string): Promise<BoletaValidada> {
  const codigo = codigoQr.trim();
  if (!codigo) throw new HttpError(400, "Falta el código QR");

  const boleta = await prisma.boleta.findUnique({
    where: { codigoQr: codigo },
    include: {
      detalleOrden: {
        include: {
          localidad: { select: { nombre: true } },
          orden: {
            include: {
              evento: { select: { id: true, nombre: true, fecha: true, lugar: true, ciudad: true } },
              usuario: { select: { nombre: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!boleta) throw new HttpError(404, "No existe una boleta con ese código QR");
  if (boleta.estado === "USADA") throw new HttpError(409, "Esta boleta ya fue usada");
  if (boleta.estado === "ANULADA") throw new HttpError(409, "Esta boleta está anulada");

  const orden = boleta.detalleOrden.orden;
  if (orden.estado !== "APROBADA") {
    throw new HttpError(409, "La orden de esta boleta todavía no está aprobada");
  }

  // Solo cambia si SIGUE activa: si otro escaneo ganó la carrera, count = 0.
  const { count } = await prisma.boleta.updateMany({
    where: { id: boleta.id, estado: "ACTIVA" },
    data: { estado: "USADA" },
  });
  if (count === 0) throw new HttpError(409, "Esta boleta ya fue usada");

  return {
    id: boleta.id,
    codigoQr: boleta.codigoQr,
    estado: "USADA",
    evento: orden.evento,
    localidad: boleta.detalleOrden.localidad.nombre,
    comprador: orden.usuario,
    orden: { id: orden.id, total: Number(orden.total), referenciaPago: orden.referenciaPago },
    validadaEn: new Date().toISOString(),
  };
}
