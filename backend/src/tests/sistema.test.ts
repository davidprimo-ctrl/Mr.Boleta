import request from "supertest";
import app from "../app";
import { documentoOpenApi } from "../docs/openapi";

describe("Sistema y documentación", () => {
  it("GET /api/health responde que el servidor está vivo", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", app: "Mr.Boleta API" });
  });

  it("GET / redirige a la documentación", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/api/docs");
  });

  it("sirve Swagger UI en /api/docs/", async () => {
    const res = await request(app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.text.toLowerCase()).toContain("swagger-ui");
  });

  it("expone el documento OpenAPI 3 con las rutas del sprint", async () => {
    const res = await request(app).get("/api/docs.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
    expect(res.body.info.version).toBe("0.3.4");
    for (const ruta of ["/api/eventos", "/api/ordenes", "/api/pagos/ordenes/{id}", "/api/admin/eventos", "/api/admin/resumen"]) {
      expect(res.body.paths).toHaveProperty(ruta);
    }
    expect(res.body.components.securitySchemes).toHaveProperty("bearerAuth");
    expect(documentoOpenApi.tags.length).toBeGreaterThanOrEqual(5);
  });
});
