import { prisma } from "../lib/prisma";
import * as ordenes from "../services/ordenes.service";
import * as pagos from "../services/pagos.service";
import * as admin from "../services/admin.service";
import { enviarBoletasPorCorreo } from "../services/correo.service";

jest.mock("../services/correo.service", () => ({
  enviarBoletasPorCorreo: jest.fn(async () => undefined),
}));

const eventoPublicado = {
  id: 4,
  estado: "PUBLICADO",
  fecha: new Date(Date.now() + 86400000),
};

describe("Lógica de negocio", () => {
  describe("Órdenes", () => {
    it("reserva los cupos y calcula el total en una transacción", async () => {
      (prisma.orden.findMany as jest.Mock).mockResolvedValue([]); // ninguna reserva vencida
      (prisma.evento.findFirst as jest.Mock).mockResolvedValue(eventoPublicado);
      (prisma.localidad.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.localidad.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: 8, nombre: "General", precio: 60000 });
      (prisma.orden.create as jest.Mock).mockResolvedValue({ id: 11 });

      const orden = await ordenes.crearOrden(3, 4, [{ localidadId: 8, cantidad: 2 }]);

      expect(orden.id).toBe(11);
      expect(prisma.localidad.updateMany).toHaveBeenCalledWith({
        where: { id: 8, eventoId: 4, cuposDisponibles: { gte: 2 } },
        data: { cuposDisponibles: { decrement: 2 } },
      });
      expect(prisma.orden.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usuarioId: 3,
            total: 120000,
            detalles: { create: [{ localidadId: 8, cantidad: 2, precioUnitario: 60000, subtotal: 120000 }] },
          }),
        }),
      );
    });

    it("no reserva nada si una localidad no tiene cupos (conflicto 409)", async () => {
      (prisma.orden.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.evento.findFirst as jest.Mock).mockResolvedValue(eventoPublicado);
      (prisma.localidad.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.localidad.findFirst as jest.Mock).mockResolvedValue({ id: 8, nombre: "General", cuposDisponibles: 1 });

      await expect(ordenes.crearOrden(3, 4, [{ localidadId: 8, cantidad: 2 }])).rejects.toMatchObject({
        status: 409,
      });
      expect(prisma.orden.create).not.toHaveBeenCalled();
    });

    it("libera los cupos de las órdenes vencidas", async () => {
      (prisma.orden.findMany as jest.Mock).mockResolvedValue([{ id: 15 }]);
      (prisma.orden.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.detalleOrden.findMany as jest.Mock).mockResolvedValue([{ localidadId: 8, cantidad: 2 }]);

      const liberadas = await ordenes.liberarOrdenesExpiradas();

      expect(liberadas).toBe(1);
      expect(prisma.orden.updateMany).toHaveBeenCalledWith({
        where: { id: 15, estado: "PENDIENTE" },
        data: { estado: "EXPIRADA" },
      });
      expect(prisma.localidad.update).toHaveBeenCalledWith({
        where: { id: 8 },
        data: { cuposDisponibles: { increment: 2 } },
      });
    });
  });

  describe("Pagos", () => {
    it("genera una boleta por entrada y dispara el correo al aprobar", async () => {
      (prisma.orden.findUnique as jest.Mock).mockResolvedValue({
        id: 15,
        estado: "PENDIENTE",
        expiraEn: new Date(Date.now() + 600000),
        detalles: [{ id: 1, cantidad: 2 }, { id: 2, cantidad: 1 }],
      });
      (prisma.orden.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await pagos.aprobarOrden(15, "MOCK-15-1");

      expect(prisma.orden.updateMany).toHaveBeenCalledWith({
        where: { id: 15, estado: "PENDIENTE" },
        data: { estado: "APROBADA", referenciaPago: "MOCK-15-1" },
      });
      expect(prisma.boleta.createMany).toHaveBeenCalledTimes(2);
      expect((prisma.boleta.createMany as jest.Mock).mock.calls[0][0].data).toHaveLength(2);
      expect((prisma.boleta.createMany as jest.Mock).mock.calls[1][0].data).toHaveLength(1);
      expect(enviarBoletasPorCorreo).toHaveBeenCalledWith(15);
    });

    it("no aprueba dos veces la misma orden", async () => {
      (prisma.orden.findUnique as jest.Mock).mockResolvedValue({ id: 15, estado: "APROBADA", detalles: [] });
      await pagos.aprobarOrden(15, "repetido");
      expect(prisma.orden.updateMany).not.toHaveBeenCalled();
      expect(enviarBoletasPorCorreo).not.toHaveBeenCalled();
    });

    it("rechaza el pago y devuelve los cupos", async () => {
      (prisma.orden.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.detalleOrden.findMany as jest.Mock).mockResolvedValue([{ localidadId: 8, cantidad: 2 }]);

      await pagos.rechazarOrden(15, "MOCK-15-2");

      expect(prisma.orden.updateMany).toHaveBeenCalledWith({
        where: { id: 15, estado: "PENDIENTE" },
        data: { estado: "RECHAZADA", referenciaPago: "MOCK-15-2" },
      });
      expect(prisma.localidad.update).toHaveBeenCalledWith({
        where: { id: 8 },
        data: { cuposDisponibles: { increment: 2 } },
      });
    });
  });

  describe("Panel de administrador", () => {
    it("calcula ventas, ingresos y cupos solo con órdenes aprobadas", async () => {
      (prisma.evento.findMany as jest.Mock).mockResolvedValue([
        {
          id: 7,
          nombre: "Salsa Brava",
          fecha: new Date("2027-12-20T01:00:00Z"),
          estado: "PUBLICADO",
          localidades: [{ aforo: 10, cuposDisponibles: 8 }, { aforo: 5, cuposDisponibles: 5 }],
        },
        { id: 8, nombre: "Jazz", fecha: new Date(), estado: "BORRADOR", localidades: [] },
      ]);
      (prisma.orden.findMany as jest.Mock).mockResolvedValue([
        {
          eventoId: 7,
          total: 120000,
          detalles: [{ cantidad: 2, boletas: [{ id: 1 }, { id: 2 }] }],
        },
      ]);

      const resumen = await admin.obtenerResumen();

      expect(resumen.totalVentas).toBe(1);
      expect(resumen.ingresos).toBe(120000);
      expect(resumen.boletasVendidas).toBe(2);
      expect(resumen.aforoTotal).toBe(15);
      expect(resumen.cuposDisponibles).toBe(13);
      expect(resumen.eventos[0]).toEqual(expect.objectContaining({ id: 7, ventas: 1, ingresos: 120000 }));
      expect(resumen.eventos[1]).toEqual(expect.objectContaining({ id: 8, ventas: 0, ingresos: 0 }));
      expect(prisma.orden.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { estado: "APROBADA" } }));
    });

    it("impide bajar el aforo por debajo de lo vendido o reservado", async () => {
      (prisma.localidad.findUnique as jest.Mock).mockResolvedValue({
        id: 12,
        eventoId: 7,
        nombre: "General",
        precio: 80000,
        aforo: 100,
        cuposDisponibles: 97, // 3 ocupados
      });

      await expect(admin.actualizarLocalidad(12, { aforo: 2 })).rejects.toMatchObject({ status: 409 });
      expect(prisma.localidad.update).not.toHaveBeenCalled();

      await admin.actualizarLocalidad(12, { aforo: 120 });
      expect(prisma.localidad.update).toHaveBeenCalledWith({
        where: { id: 12 },
        data: { aforo: 120, cuposDisponibles: 117 },
      });
    });
  });
});
