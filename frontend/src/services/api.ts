import type { Evento } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

/** Hace una petición a la API y devuelve el JSON (o lanza el mensaje de error). */
async function pedir<T>(ruta: string): Promise<T> {
  const respuesta = await fetch(`${API_URL}${ruta}`);
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