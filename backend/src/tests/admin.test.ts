import request from "supertest";
import app from "../app";
import * as admin from "../services/admin.service";

jest.mock("../services/admin.service", () => ({
  listarEventos: jest.fn(async () => [{ id: 7, nombre: "Noche de Salsa Brava", estado: "PUBLICADO", localidades: [] }]),
  obtenerEvento: jest.fn(async (id: number) => ({ id, nombre: "Noche de Salsa Brava", localidades: [] })),
  crearEvento: jest.fn(async (datos: object, localidades: object[]) => ({ id: 9, ...datos, localidades })),
  actualizarEvento: jest.fn(async (id: number, datos: object) => ({ id, ...datos })),
  cambiarEstado: jest.fn(async (id: number, estado: string) => ({ id, estado })),
  agregarLocalidad: jest.fn(async (eventoId: number, datos: object) => ({ id: 20, eventoId, ...datos })),
  actualizarLocalidad: jest.fn(async (id: number, datos: object) => ({ id, ...datos })),
  obtenerResumen: jest.fn(async () => ({
    totalVentas: 3,
    ingresos: 450000,
    boletasVendidas: 7,
    aforoTotal: 200,
    cuposDisponibles: 193,
    eventos: [{ id: 7, nombre: "Noche de Salsa Brava", ventas: 3, ingresos: 450000 }],
  })),
}));

const comoAdmin = (peticion: request.Test) => peticion.set("Authorization", "Bearer token").set("x-test-rol", "ADMIN");
const comoComprador = (peticion: request.Test) =>
  peticion.set("Authorization", "Bearer token").set("x-test-rol", "COMPRADOR");

const datosEvento = {
  nombre: "Noche de Salsa Brava",
  descripcion: "Una noche de salsa",
  artista: "Varios artistas",
  lugar: "Coliseo Mayor",
  ciudad: "Ibagué",
  fecha: "2027-12-20T20:00:00-05:00",
  localidades: [{ nombre: "General", precio: 80000, aforo: 200 }],
};

describe("API del panel de administrador", () => {
  it("responde 401 sin token", async () => {
    const res = await request(app).get("/api/admin/eventos");
    expect(res.status).toBe(401);
  });

  it("responde 403 a un usuario que no es ADMIN", async () => {
    const res = await comoComprador(request(app).get("/api/admin/eventos"));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Solo para administradores");
  });

  it("lista eventos para un ADMIN", async () => {
    const res = await comoAdmin(request(app).get("/api/admin/eventos"));
    expect(res.status).toBe(200);
    expect(res.body[0].nombre).toBe("Noche de Salsa Brava");
    expect(admin.listarEventos).toHaveBeenCalled();
  });

  it("devuelve el reporte HU09 con ventas, ingresos y cupos", async () => {
    const res = await comoAdmin(request(app).get("/api/admin/resumen"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        totalVentas: 3,
        ingresos: 450000,
        boletasVendidas: 7,
        aforoTotal: 200,
        cuposDisponibles: 193,
      }),
    );
    expect(res.body.eventos).toHaveLength(1);
    expect(admin.obtenerResumen).toHaveBeenCalled();
  });

  it("rechaza con 400 un evento sin campos obligatorios", async () => {
    const res = await comoAdmin(request(app).post("/api/admin/eventos").send({ nombre: "Sin datos" }));
    expect(res.status).toBe(400);
    expect(admin.crearEvento).not.toHaveBeenCalled();
  });

  it("crea un evento con sus localidades", async () => {
    const res = await comoAdmin(request(app).post("/api/admin/eventos").send(datosEvento));
    expect(res.status).toBe(201);
    expect(res.body.localidades).toHaveLength(1);
    expect(admin.crearEvento).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Noche de Salsa Brava" }),
      expect.arrayContaining([expect.objectContaining({ nombre: "General" })]),
    );
  });

  it("rechaza con 400 un estado inválido", async () => {
    const res = await comoAdmin(request(app).patch("/api/admin/eventos/7/estado").send({ estado: "BORRANDO" }));
    expect(res.status).toBe(400);
    expect(admin.cambiarEstado).not.toHaveBeenCalled();
  });

  it("publica un evento con estado válido", async () => {
    const res = await comoAdmin(request(app).patch("/api/admin/eventos/7/estado").send({ estado: "PUBLICADO" }));
    expect(res.status).toBe(200);
    expect(admin.cambiarEstado).toHaveBeenCalledWith(7, "PUBLICADO");
  });

  it("valida el id de la ruta", async () => {
    const res = await comoAdmin(request(app).get("/api/admin/eventos/abc"));
    expect(res.status).toBe(400);
  });
});
