import type { RequestHandler } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";

/** 1) Valida que el token venga firmado por NUESTRO Auth0 y que sea para NUESTRA API. */
const validarToken = auth({
  issuerBaseURL: `https://${env.auth0.domain}/`,
  audience: env.auth0.audience,
  tokenSigningAlg: "RS256",
});

/** 2) Busca al usuario en la BD; si es su primera vez, lo crea con sus datos de Google. */
const cargarUsuario: RequestHandler = async (req, res, next) => {
  const auth0Id = req.auth?.payload.sub; // identificador único del usuario en Auth0
  if (!auth0Id) {
    res.status(401).json({ error: "El token no tiene usuario" });
    return;
  }

  let usuario = await prisma.usuario.findUnique({ where: { auth0Id } });

  if (!usuario) {
    // Primera vez: pedimos nombre y correo a Auth0
    const respuesta = await fetch(`https://${env.auth0.domain}/userinfo`, {
      headers: { Authorization: req.headers.authorization ?? "" },
    });
    if (!respuesta.ok) {
      res.status(401).json({ error: "No se pudo obtener el perfil de Auth0" });
      return;
    }
    const perfil = (await respuesta.json()) as { email?: string; name?: string };

    usuario = await prisma.usuario.upsert({
      where: { auth0Id },
      update: {},
      create: {
        auth0Id,
        email: perfil.email ?? `${auth0Id}@sin-correo.local`,
        nombre: perfil.name ?? "Usuario",
      },
    });
  }

  req.usuario = { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol };
  next();
};

/** Para rutas que requieren sesión iniciada (comprador o admin). */
export const requiereAuth = [validarToken, cargarUsuario];

/** Para rutas solo de administrador. Va DESPUÉS de requiereAuth. */
export const requiereAdmin: RequestHandler = (req, res, next) => {
  if (req.usuario?.rol !== "ADMIN") {
    res.status(403).json({ error: "Solo para administradores" });
    return;
  }
  next();
};