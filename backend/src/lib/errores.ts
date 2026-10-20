/** Error con código HTTP (400, 404, 409...). El manejador de errores de app.ts lo responde en JSON. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}