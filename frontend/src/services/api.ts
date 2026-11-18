import type {
  DatosEvento,
  DatosLocalidad,
  Evento,
  Orden,
  ResumenAdmin,
  Usuario,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

/** Hace una petición a la API y devuelve el JSON (o lanza el mensaje de error). */
async function pedir<T>(ruta: string, token?: string, metodo = "GET", cuerpo?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) headers["Content-Type"] = "application/json";

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datos.error ?? "Error al comunicarse con el servidor");
  }
  return datos as T;
}

/** Lista de eventos publicados, con búsqueda opcional. */
export function obtenerEventos(busqueda = "") {
  const parametros = busqueda ? `?q=${encodeURIComponent(busqueda)}` : "";
  return pedir<Evento[]>(`/eventos${parametros}`);
}

/** Detalle de un evento. */
export function obtenerEvento(id: string | number) {
  return pedir<Evento>(`/eventos/${id}`);
}

/** Usuario que inició sesión (el backend lo registra la primera vez). */
export function obtenerMiPerfil(token: string) {
  return pedir<Usuario>("/usuarios/me", token);
}

/** Crea una orden y reserva los cupos por 10 minutos. */
export function crearOrden(
  token: string,
  eventoId: number,
  items: { localidadId: number; cantidad: number }[],
) {
  return pedir<Orden>("/ordenes", token, "POST", { eventoId, items });
}

/** Una orden del usuario que inició sesión. */
export function obtenerOrden(token: string, id: string | number) {
  return pedir<Orden>(`/ordenes/${id}`, token);
}

/** Inicia el pago de una orden: devuelve la URL de la pasarela. */
export function iniciarPago(token: string, ordenId: number) {
  return pedir<{ urlPago: string }>(`/pagos/ordenes/${ordenId}`, token, "POST");
}

/** Todas las órdenes del usuario que inició sesión (con sus boletas). */
export function obtenerMisOrdenes(token: string) {
  return pedir<Orden[]>("/ordenes", token);
}

// ───── Panel de administrador (solo rol ADMIN) ─────

/** Todos los eventos, incluidos borradores e inactivos. */
export function listarEventosAdmin(token: string) {
  return pedir<Evento[]>("/admin/eventos", token);
}

/** Crea un evento en BORRADOR con sus localidades. */
export function crearEventoAdmin(
  token: string,
  datos: DatosEvento & { localidades: DatosLocalidad[] },
) {
  return pedir<Evento>("/admin/eventos", token, "POST", datos);
}

/** Edita los campos enviados de un evento. */
export function actualizarEventoAdmin(token: string, id: number, datos: Partial<DatosEvento>) {
  return pedir<Evento>(`/admin/eventos/${id}`, token, "PUT", datos);
}

/** Publica, vuelve a borrador o desactiva un evento. */
export function cambiarEstadoEvento(token: string, id: number, estado: Evento["estado"]) {
  return pedir<Evento>(`/admin/eventos/${id}/estado`, token, "PATCH", { estado });
}

/** Agrega una localidad a un evento. */
export function agregarLocalidadAdmin(token: string, eventoId: number, datos: DatosLocalidad) {
  return pedir<Evento>(`/admin/eventos/${eventoId}/localidades`, token, "POST", datos);
}

/** Edita nombre, precio y/o aforo de una localidad. */
export function actualizarLocalidadAdmin(token: string, id: number, datos: Partial<DatosLocalidad>) {
  return pedir<Evento>(`/admin/localidades/${id}`, token, "PUT", datos);
}

/** HU09: ventas, ingresos y cupos restantes. */
export function obtenerResumenAdmin(token: string) {
  return pedir<ResumenAdmin>("/admin/resumen", token);
}