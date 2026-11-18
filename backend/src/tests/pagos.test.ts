import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";
import { pasarela } from "../services/pagos";
import { aprobarOrden, rechazarOrden } from "../services/pagos.service";

jest.mock("../services/pagos", () => ({
  pasarela: { iniciarPago: jest.fn(async () => ({ urlPago: "http://localhost:3000/api/pagos/mock/10" })) },
}));

jest.mock("../services/pagos.service", () => ({
  aprobarOrden: jest.fn(async () => undefined),
  rechazarOrden: jest.fn(async () => undefined),
}));

const conToken = (peticion: request.Test) => peticion.set("Authorization", "Bearer token");
const ordenPendiente = { id: 10, estado: "PENDIENTE", expiraEn: new Date(Date.now() + 600000), total: 80000, evento: { nombre: "Jazz" } };

describe("Pagos (pasarela simulada)", () => {
  it("exige sesión para iniciar el pago", async () => {
    const res = await request(app).post("/api/pagos/ordenes/10");
    expect(res.status).toBe(401);
    expect(pasarela.iniciarPago).not.toHaveBeenCalled();
  });

  it("responde 404 si la orden no pertenece al usuario", async () => {
    (prisma.orden.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await conToken(request(app).post("/api/pagos/ordenes/10"));
    expect(res.status).toBe(404);
  });

  it("devuelve la URL de la pasarela para una orden vigente", async () => {
    (prisma.orden.findFirst as jest.Mock).mockResolvedValue(ordenPendiente);
    const res = await conToken(request(app).post("/api/pagos/ordenes/10"));
    expect(res.status).toBe(200);
    expect(res.body.urlPago).toContain("/api/pagos/mock/10");
    expect(pasarela.iniciarPago).toHaveBeenCalledWith({ id: 10, total: 80000 });
  });

  it("rechaza 409 si la reserva ya venció", async () => {
    (prisma.orden.findFirst as jest.Mock).mockResolvedValue({
      ...ordenPendiente,
      expiraEn: new Date(Date.now() - 1000),
    });
    const res = await conToken(request(app).post("/api/pagos/ordenes/10"));
    expect(res.status).toBe(409);
  });

  it("muestra la página de pago simulada", async () => {
    (prisma.orden.findUnique as jest.Mock).mockResolvedValue(ordenPendiente);
    const res = await request(app).get("/api/pagos/mock/10");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Aprobar pago");
  });

  it("aprueba la orden y redirige al frontend", async () => {
    const res = await request(app).post("/api/pagos/mock/10/aprobar");
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe("http://localhost:5173/ordenes/10");
    expect(aprobarOrden).toHaveBeenCalledWith(10, expect.stringContaining("MOCK-10-"));
  });

  it("rechaza la orden y devuelve los cupos", async () => {
    const res = await request(app).post("/api/pagos/mock/10/rechazar");
    expect(res.status).toBe(303);
    expect(rechazarOrden).toHaveBeenCalledWith(10, expect.stringContaining("MOCK-10-"));
  });

  it("responde 400 ante un resultado desconocido", async () => {
    const res = await request(app).post("/api/pagos/mock/10/otro");
    expect(res.status).toBe(400);
  });
});
