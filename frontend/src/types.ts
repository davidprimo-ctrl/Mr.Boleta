// Tipos que devuelve la API (deben coincidir con el modelo de Prisma)

export interface Localidad {
  id: number;
  nombre: string;
  precio: string; // la API envía los Decimal como texto
  aforo: number;
  cuposDisponibles: number;
  eventoId: number;
}

export interface Evento {
  id: number;
  nombre: string;
  descripcion: string;
  artista: string;
  lugar: string;
  ciudad: string;
  fecha: string; // fecha en formato ISO
  imagenUrl: string | null;
  estado: "BORRADOR" | "PUBLICADO" | "INACTIVO";
  localidades: Localidad[];
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: "COMPRADOR" | "ADMIN";
}