import type { Rol } from "../generated/prisma/client";

/** El middleware de Auth0 coloca aquí al usuario que inició sesión. */
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        email: string;
        nombre: string;
        rol: Rol;
      };
    }
  }
}