import { Router } from "express";

export const usuariosRouter = Router();

// GET /api/usuarios/me → el usuario que inició sesión (se registra en la BD la primera vez)
usuariosRouter.get("/me", (req, res) => {
  res.json(req.usuario);
});