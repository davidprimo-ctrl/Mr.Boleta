import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";

const evento = {
  id: 4,
  nombre: "Jazz bajo las estrellas",
  artista: "Trío Andino",
  lugar: "Teatro Tolima",
  ciudad: "Ibagué",
  fecha: new Date("2027-01-20T01:00:00.000Z"),
  estado: "PUBLICADO",
  localidades: [],
};

describe("Catálogo público", () => {
  beforeEach(() => {
    (prisma.evento.findMany as jest.Mock).mockResolvedValue([evento]);
    (prisma.evento.findFirst as jest.Mock).mockResolvedValue(evento);
  });

  it("lista los eventos publicados y aplica la búsqueda", async () => {
    const res = await request(app).get("/api/eventos").query({ q: "jazz" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe("Jazz bajo las estrellas");
    expect(prisma.evento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ estado: "PUBLICADO" }) }),
    );
  });

  it("rechaza un id que no es entero positivo con 400", async () => {
    const res = await request(app).get("/api/eventos/abc");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/entero positivo/);
    expect(prisma.evento.findFirst).not.toHaveBeenCalled();
  });

  it("responde 404 si el evento no existe o no está publicado", async () => {
    (prisma.evento.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get("/api/eventos/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Evento no encontrado");
  });

  it("devuelve el detalle de un evento publicado", async () => {
    const res = await request(app).get("/api/eventos/4");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(4);
    expect(prisma.evento.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 4, estado: "PUBLICADO" } }),
    );
  });
});
