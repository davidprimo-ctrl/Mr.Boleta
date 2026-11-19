import { Router, type Request, type Response } from "express";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errores";
import { requiereAuth } from "../middlewares/auth";
import { pasarela } from "../services/pagos";
import { firmaWebhookValida, procesarPagoMercadoPago } from "../services/pagos/mercadopago";
import { aprobarOrden, rechazarOrden } from "../services/pagos.service";
import { MINUTOS_RESERVA } from "../services/ordenes.service";

export const pagosRouter = Router();

function leerId(valor: string) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Id inválido");
  return id;
}

// ─── Iniciar el pago (requiere sesión) ───
pagosRouter.use("/ordenes", requiereAuth);

// POST /api/pagos/ordenes/:id → devuelve la URL de la pasarela para pagar MI orden
pagosRouter.post("/ordenes/:id", async (req, res) => {
  const id = leerId(req.params.id);
  const orden = await prisma.orden.findFirst({ where: { id, usuarioId: req.usuario!.id } });
  if (!orden) throw new HttpError(404, "Orden no encontrada");
  if (orden.estado !== "PENDIENTE" || orden.expiraEn < new Date()) {
    throw new HttpError(409, "La reserva ya no está vigente");
  }

  // Al abrir el checkout se renueva la ventana: el comprador tiene otros 10 minutos
  // para pagar en Mercado Pago sin que el limpiador de órdenes le quite los cupos.
  await prisma.orden.update({
    where: { id: orden.id },
    data: { expiraEn: new Date(Date.now() + MINUTOS_RESERVA * 60_000) },
  });

  res.json(await pasarela.iniciarPago({ id: orden.id, total: Number(orden.total) }));
});

// ─── Pasarela simulada (solo existe con PAYMENT_PROVIDER=mock) ───
if (env.PAYMENT_PROVIDER === "mock") {
  // GET /api/pagos/mock/:id → página de pago de prueba
  pagosRouter.get("/mock/:id", async (req, res) => {
    const id = leerId(req.params.id);
    const orden = await prisma.orden.findUnique({ where: { id }, include: { evento: true } });
    if (!orden) throw new HttpError(404, "Orden no encontrada");
    res.send(paginaPagoMock(orden.id, orden.evento.nombre, Number(orden.total)));
  });

  // POST /api/pagos/mock/:id/aprobar  ó  /rechazar → simula la respuesta de la pasarela
  pagosRouter.post("/mock/:id/:resultado", async (req, res) => {
    const id = leerId(req.params.id);
    const referencia = `MOCK-${id}-${Date.now()}`;

    if (req.params.resultado === "aprobar") await aprobarOrden(id, referencia);
    else if (req.params.resultado === "rechazar") await rechazarOrden(id, referencia);
    else throw new HttpError(400, "Resultado inválido");

    // Igual que una pasarela real: devuelve al comprador a Mr.Boleta
    res.redirect(303, `${env.FRONTEND_URL}/ordenes/${id}`);
  });
}

// ─── Mercado Pago (Checkout Pro) ───

// GET /api/pagos/mercadopago/config → diagnóstico sin exponer el token
pagosRouter.get("/mercadopago/config", async (req: Request, res: Response) => {
  const token = env.mercadopago.accessToken;
  const base = {
    proveedor: env.PAYMENT_PROVIDER,
    configurado: Boolean(token),
    checkout: "Checkout Pro",
    // El entorno (prueba/producción) lo define la pestaña de credenciales usada,
    // no el prefijo: Mercado Pago usa APP_USR- en ambos casos.
    webhook: `${env.API_URL.replace(/\/+$/, "")}/api/pagos/mercadopago/webhook`,
  };

  // ?verificar=1 consulta /users/me para comprobar que el token es válido.
  if (req.query.verificar !== "1" || !token) {
    res.json(base);
    return;
  }

  try {
    const respuesta = await fetch(`${env.mercadopago.apiUrl}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!respuesta.ok) {
      res.status(502).json({ ...base, valido: false, status: respuesta.status });
      return;
    }
    const cuenta = (await respuesta.json()) as { email?: string; country_id?: string; site_id?: string };
    res.json({
      ...base,
      valido: true,
      pais: cuenta.country_id ?? cuenta.site_id ?? null,
      // Las cuentas de prueba de Mercado Pago usan correos @testuser.com.
      cuentaDePrueba: typeof cuenta.email === "string" && /test_?user/i.test(cuenta.email),
    });
  } catch {
    res.status(502).json({ ...base, valido: false });
  }
});

// POST/GET /api/pagos/mercadopago/webhook → aviso de pago de Mercado Pago (sin sesión)
async function webhookMercadoPago(req: Request, res: Response) {
  const tipo = String(req.query.type ?? req.query.topic ?? req.body?.type ?? "");
  const dataId = String(req.query["data.id"] ?? req.query.id ?? req.body?.data?.id ?? "");

  // Sin pago que procesar (o aviso de otro tipo, como merchant_order): se confirma la recepción.
  if (!dataId || (tipo && tipo !== "payment")) {
    res.json({ ok: true, ignorado: true });
    return;
  }

  const firmaValida = firmaWebhookValida({
    dataId,
    requestId: req.header("x-request-id"),
    signature: req.header("x-signature"),
    secreto: env.mercadopago.webhookSecret,
  });
  if (!firmaValida) throw new HttpError(401, "Firma del webhook inválida");

  // Se consulta el pago a la API: el webhook solo avisa, no se le cree al body.
  res.json({ ok: true, ...(await procesarPagoMercadoPago(dataId)) });
}

pagosRouter.post("/mercadopago/webhook", webhookMercadoPago);
pagosRouter.get("/mercadopago/webhook", webhookMercadoPago);

// POST /api/pagos/mercadopago/confirmar → el navegador confirma al volver del checkout
pagosRouter.post("/mercadopago/confirmar", requiereAuth, async (req: Request, res: Response) => {
  const paymentId = typeof req.body?.paymentId === "string" ? req.body.paymentId.trim() : "";
  if (!paymentId) throw new HttpError(400, 'Se espera { "paymentId": "..." }');

  const resultado = await procesarPagoMercadoPago(paymentId, req.usuario!.id);
  res.json({ ok: true, ...resultado });
});

/** Evita que un texto de la base de datos se interprete como HTML. */
function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function paginaPagoMock(id: number, evento: string, total: number) {
  const totalCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(total);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pasarela de pagos (simulada)</title>
</head>
<body style="font-family:system-ui,sans-serif;background:#0b1530;color:#fff;display:flex;justify-content:center;padding:48px 16px;margin:0">
  <div style="background:#111e42;border:1px solid #1a2a57;border-radius:16px;padding:32px;max-width:420px;width:100%">
    <p style="color:#fbbf24;font-size:12px;font-weight:bold;letter-spacing:1px;margin:0">MODO DE PRUEBA · NO SE MUEVE DINERO REAL</p>
    <h1 style="margin:8px 0 4px">Pasarela de pagos</h1>
    <p style="color:#9ca3af;margin:0 0 24px">Orden #${id} · ${escapar(evento)}</p>
    <p style="font-size:32px;font-weight:800;margin:0 0 24px">${totalCOP}</p>
    <form method="post" action="/api/pagos/mock/${id}/aprobar">
      <button style="width:100%;padding:14px;border:0;border-radius:8px;background:#22c55e;color:#fff;font-weight:bold;font-size:16px;cursor:pointer">✓ Aprobar pago</button>
    </form>
    <form method="post" action="/api/pagos/mock/${id}/rechazar" style="margin-top:12px">
      <button style="width:100%;padding:14px;border:0;border-radius:8px;background:#ef4444;color:#fff;font-weight:bold;font-size:16px;cursor:pointer">✕ Rechazar pago</button>
    </form>
  </div>
</body>
</html>`;
}