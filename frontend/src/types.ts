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

export type EstadoOrden = "PENDIENTE" | "APROBADA" | "RECHAZADA" | "EXPIRADA";

export interface Boleta {
  id: number;
  codigoQr: string;
  estado: "ACTIVA" | "USADA" | "ANULADA";
}

export interface DetalleOrden {
  id: number;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
  localidad: { id: number; nombre: string };
  boletas: Boleta[];
}

export interface Orden {
  id: number;
  estado: EstadoOrden;
  total: string;
  expiraEn: string;
  creadoEn: string;
  referenciaPago: string | null;
  evento: { id: number; nombre: string; fecha: string; lugar: string; ciudad: string };
  detalles: DetalleOrden[];
}