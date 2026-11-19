import { createHmac } from "node:crypto";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errores";
import { aprobarOrden, rechazarOrden } from "../services/pagos.service";
import {
  firmaWebhookValida,
  pasarelaMercadoPago,
  procesarPagoMercadoPago,
} from "../services/pagos/mercadopago";

jest.mock("../services/pagos.service", () => ({
  aprobarOrden: jest.fn(async () => undefined),
  rechazarOrden: jest.fn(async () => undefined),
}));

const respuesta = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response;

const fetchMock = jest.fn();
const fetchOriginal = global.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = fetchOriginal;
});

describe("Mercado Pago (Checkout Pro)", () => {
  it("crea una preferencia en COP y devuelve el init_point de Checkout Pro", async () => {
    fetchMock.mockResolvedValue(
      respuesta({ init_point: "https://mp/init", sandbox_init_point: "https://mp/sandbox" }),
    );

    const { urlPago } = await pasarelaMercadoPago.iniciarPago({ id: 15, total: 120000 });

    expect(urlPago).toBe("https://mp/init");
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.mercadopago.com/checkout/preferences");
    expect(opciones.headers.Authorization).toBe("Bearer TEST-token-de-prueba");

    const cuerpo = JSON.parse(opciones.body);
    expect(cuerpo.external_reference).toBe("15");
    expect(cuerpo.items[0]).toMatchObject({ currency_id: "COP", unit_price: 120000, quantity: 1 });
    expect(cuerpo.notification_url).toContain("/api/pagos/mercadopago/webhook");
    expect(cuerpo.back_urls.success).toContain("/ordenes/15");
    expect(cuerpo).not.toHaveProperty("auto_return"); // en local es HTTP, no HTTPS
  });

  it("responde 502 si Mercado Pago rechaza la preferencia", async () => {
    fetchMock.mockResolvedValue(respuesta({ message: "invalid token" }, false, 401));

    await expect(pasarelaMercadoPago.iniciarPago({ id: 15, total: 120000 })).rejects.toMatchObject({
      status: 502,
    });
  });

  it("aprueba la orden cuando el pago está approved", async () => {
    fetchMock.mockResolvedValue(
      respuesta({ id: 999, status: "approved", external_reference: "15" }),
    );

    const resultado = await procesarPagoMercadoPago("999");

    expect(resultado).toMatchObject({ ordenId: 15, estadoPago: "approved", accion: "aprobada" });
    expect(aprobarOrden).toHaveBeenCalledWith(15, "MP-999");
    expect(rechazarOrden).not.toHaveBeenCalled();
  });

  it("rechaza la orden cuando el pago está rejected", async () => {
    fetchMock.mockResolvedValue(
      respuesta({ id: 999, status: "rejected", external_reference: "15" }),
    );

    const resultado = await procesarPagoMercadoPago("999");

    expect(resultado.accion).toBe("rechazada");
    expect(rechazarOrden).toHaveBeenCalledWith(15, "MP-999");
  });

  it("no toca la orden si el pago sigue pendiente", async () => {
    fetchMock.mockResolvedValue(
      respuesta({ id: 999, status: "pending", external_reference: "15" }),
    );

    const resultado = await procesarPagoMercadoPago("999");

    expect(resultado.accion).toBe("pendiente");
    expect(aprobarOrden).not.toHaveBeenCalled();
    expect(rechazarOrden).not.toHaveBeenCalled();
  });

  it("no duplica boletas si la orden ya había sido procesada", async () => {
    fetchMock.mockResolvedValue(
      respuesta({ id: 999, status: "approved", external_reference: "15" }),
    );
    (aprobarOrden as jest.Mock).mockRejectedValueOnce(new HttpError(409, "ya procesada"));

    const resultado = await procesarPagoMercadoPago("999");

    expect(resultado.accion).toBe("ignorada");
  });

  it("solo permite confirmar una orden del usuario que la pide", async () => {
    fetchMock.mockResolvedValue(
      respuesta({ id: 999, status: "approved", external_reference: "15" }),
    );
    (prisma.orden.findFirst as jest.Mock).mockResolvedValue({ id: 15 });

    await procesarPagoMercadoPago("999", 7);
    expect(prisma.orden.findFirst).toHaveBeenCalledWith({ where: { id: 15, usuarioId: 7 } });

    (prisma.orden.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(procesarPagoMercadoPago("999", 7)).rejects.toMatchObject({ status: 404 });
  });

  it("valida la firma HMAC del webhook", () => {
    const secreto = "secreto-de-prueba";
    const dataId = "999";
    const requestId = "req-1";
    const ts = "1700000000";
    const manifiesto = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac("sha256", secreto).update(manifiesto).digest("hex");

    expect(firmaWebhookValida({ dataId, requestId, signature: `ts=${ts},v1=${v1}`, secreto })).toBe(true);
    expect(firmaWebhookValida({ dataId, requestId, signature: `ts=${ts},v1=deadbeef`, secreto })).toBe(false);
    expect(firmaWebhookValida({ dataId, requestId: undefined, signature: `ts=${ts},v1=${v1}`, secreto })).toBe(false);
    // Sin secreto configurado no se exige firma: la verdad se consulta a la API de MP.
    expect(firmaWebhookValida({ dataId, requestId, signature: undefined, secreto: "" })).toBe(true);
  });
});
