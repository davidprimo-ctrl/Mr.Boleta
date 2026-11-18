import nodemailer, { type Transporter } from "nodemailer";
import QRCode from "qrcode";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";

let transporte: Transporter | null = null;

/** Crea la conexión SMTP una sola vez. Sin SMTP_HOST usa una cuenta de prueba de Ethereal. */
async function obtenerTransporte() {
  if (transporte) return transporte;

  if (env.correo.host) {
    transporte = nodemailer.createTransport({
      host: env.correo.host,
      port: env.correo.port,
      secure: env.correo.port === 465,
      auth: { user: env.correo.user, pass: env.correo.pass },
    });
  } else {
    const prueba = await nodemailer.createTestAccount();
    transporte = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: prueba.user, pass: prueba.pass },
    });
    console.log("📧 Correo en modo de prueba (Ethereal): los mensajes no llegan a bandejas reales");
  }
  return transporte;
}

const formatoCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);

const formatoFecha = (fecha: Date) =>
  new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeStyle: "short", timeZone: "America/Bogota" }).format(fecha);

/** Evita que un texto de la base de datos se interprete como HTML. */
const escapar = (texto: string) => texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Envía al comprador un correo con una imagen QR por cada boleta de la orden. */
export async function enviarBoletasPorCorreo(ordenId: number) {
  const orden = await prisma.orden.findUnique({
    where: { id: ordenId },
    include: {
      usuario: true,
      evento: true,
      detalles: { include: { localidad: true, boletas: true } },
    },
  });
  if (!orden || orden.estado !== "APROBADA") return;

  const boletas = orden.detalles.flatMap((d) =>
    d.boletas.map((b, i) => ({ codigo: b.codigoQr, etiqueta: `${d.localidad.nombre} · Boleta ${i + 1}` })),
  );

  // Cada QR va como imagen adjunta "en línea" (cid), así se ve dentro del correo
  const adjuntos = await Promise.all(
    boletas.map(async (b, i) => ({
      filename: `boleta-${i + 1}.png`,
      content: await QRCode.toBuffer(b.codigo, { width: 240, margin: 1 }),
      cid: `qr-${i}`,
    })),
  );

  const tarjetas = boletas
    .map(
      (b, i) => `
      <td style="padding:8px;text-align:center">
        <div style="background:#ffffff;border-radius:12px;padding:12px;display:inline-block">
          <img src="cid:qr-${i}" width="160" height="160" alt="Código QR de la boleta">
          <p style="margin:8px 0 0;font-weight:bold;color:#0b1530">${escapar(b.etiqueta)}</p>
          <p style="margin:4px 0 0;font-size:10px;color:#6b7280">${b.codigo}</p>
        </div>
      </td>`,
    )
    .join("");

  const html = `
  <div style="font-family:Arial,sans-serif;background:#0b1530;color:#ffffff;padding:32px">
    <h1 style="margin:0">Mr.<span style="color:#5b9bff">Boleta</span></h1>
    <p>Hola ${escapar(orden.usuario.nombre)}, ¡tu compra fue aprobada! 🎉</p>
    <h2 style="margin:24px 0 4px">${escapar(orden.evento.nombre)}</h2>
    <p style="margin:0;color:#bfcbe6">${formatoFecha(orden.evento.fecha)}</p>
    <p style="margin:0;color:#bfcbe6">${escapar(orden.evento.lugar)} · ${escapar(orden.evento.ciudad)}</p>
    <p>Orden #${orden.id} · Total: <b>${formatoCOP(Number(orden.total))}</b></p>
    <table role="presentation"><tr>${tarjetas}</tr></table>
    <p style="color:#bfcbe6">Presenta cada código QR en la entrada del evento.
      También puedes verlos en <a style="color:#5b9bff" href="${env.FRONTEND_URL}/mis-boletas">Mis boletas</a>.</p>
  </div>`;

  const transporte = await obtenerTransporte();
  const info = await transporte.sendMail({
    from: env.correo.remitente,
    to: orden.usuario.email,
    subject: `🎟️ Tus boletas para ${orden.evento.nombre}`,
    html,
    attachments: adjuntos,
  });

  const vistaPrevia = nodemailer.getTestMessageUrl(info);
  console.log(`📧 Boletas de la orden #${orden.id} enviadas a ${orden.usuario.email}`);
  if (vistaPrevia) console.log(`   Vista previa: ${vistaPrevia}`);
}