import request from "supertest";
import app from "../app";
import * as ordenes from "../services/ordenes.service";

jest.mock("../services/ordenes.service", () => ({
  MINUTOS_RESERVA: 10,
  MAX_BOLETAS_POR_ORDEN: 10,
  crearOrden: jest.fn(async (usuarioId: number, eventoId: number) => ({
    id: 15,
    usuarioId,
    eventoId,
    estado: "PENDIENTE",
    detalles: [],
  })),
  listarOrdenesDeUsuario: jest.fn(async () => [{ id: 15, estado: "APROBADA" }]),
  obtenerOrdenDeUsuario: jest.fn(async (id: number) => ({ id, estado: "APROBADA" })),
}));

const conToken = (peticion: request.Test) => peticion.set("Authorization", "Bearer token");

describe("Órdenes y reserva de cupos", () => {
  it("exige sesión para crear una orden", async () => {
    const res = await request(app).post("/api/ordenes").send({ eventoId: 4, items: [{ localidadId: 8, cantidad: 1 }] });
    expect(res.status).toBe(401);
    expect(ordenes.crearOrden).not.toHaveBeenCalled();
  });

  it("rechaza un body inválido con 400", async () => {
    const res = await conToken(request(app).post("/api/ordenes")).send({ eventoId: "4", items: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Datos inválidos/);
  });

  it("crea la orden para el usuario autenticado y reserva los cupos", async () => {
    const res = await conToken(request(app).post("/api/ordenes")).send({
      eventoId: 4,
      items: [{ localidadId: 8, cantidad: 2 }],
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({ id: 15, estado: "PENDIENTE" }));
    expect(ordenes.crearOrden).toHaveBeenCalledWith(1, 4, [{ localidadId: 8, cantidad: 2 }]);
  });

  it("lista mis órdenes", async () => {
    const res = await conToken(request(app).get("/api/ordenes"));
    expect(res.status).toBe(200);
    expect(res.body[0].estado).toBe("APROBADA");
    expect(ordenes.listarOrdenesDeUsuario).toHaveBeenCalledWith(1);
  });

  it("obtiene una orden y valida el id", async () => {
    const valida = await conToken(request(app).get("/api/ordenes/abc"));
    expect(valida.status).toBe(400);

    const res = await conToken(request(app).get("/api/ordenes/15"));
    expect(res.status).toBe(200);
    expect(ordenes.obtenerOrdenDeUsuario).toHaveBeenCalledWith(15, 1);
  });
});
