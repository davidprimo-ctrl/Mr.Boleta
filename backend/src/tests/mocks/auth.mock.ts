import type { RequestHandler } from "express";

/**
 * Doble de Auth0: sin cabecera Authorization responde 401, y el rol se elige
 * con la cabecera x-test-rol (por defecto COMPRADOR). Así se pueden probar
 * los 401/403 sin token real ni Auth0.
 */
const requiereAuth: RequestHandler[] = [
  (req, res, next) => {
    if (!req.header("authorization")) {
      res.status(401).json({ error: "Sin token" });
      return;
    }
    req.usuario = {
      id: 1,
      email: "prueba@mrboleta.com",
      nombre: "Usuario de prueba",
      rol: req.header("x-test-rol") === "ADMIN" ? "ADMIN" : "COMPRADOR",
    };
    next();
  },
];

const requiereAdmin: RequestHandler = (req, res, next) => {
  if (req.usuario?.rol !== "ADMIN") {
    res.status(403).json({ error: "Solo para administradores" });
    return;
  }
  next();
};

export { requiereAuth, requiereAdmin };
