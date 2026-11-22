// Tipos que devuelve la API (deben coincidir con el modelo de Prisma)

export type MapaId = "generico" | "movistar-arena" | "vive-claro";

export interface Localidad {
  id: number;
  nombre: string;
  precio: string; // la API envía los Decimal como texto
  aforo: number;
  cuposDisponibles: number;
  zona: string | null; // código de la sección en el mapa preestablecido
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
  mapa: MapaId;
  localidades: Localidad[];
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: "COMPRADOR" | "ADMIN";
}

/** Datos que envía el panel de administración al crear o editar un evento. */
export interface DatosEvento {
  nombre: string;
  descripcion: string;
  artista: string;
  lugar: string;
  ciudad: string;
  fecha: string;
  imagenUrl?: string | null;
  mapa?: MapaId;
}

export interface DatosLocalidad {
  nombre: string;
  precio: number;
  aforo: number;
  zona?: string | null;
}

/** Resumen de un evento en el reporte HU09. */
export interface EventoResumen {
  id: number;
  nombre: string;
  fecha: string;
  estado: Evento["estado"];
  ventas: number;
  ingresos: number;
  boletasVendidas: number;
  aforoTotal: number;
  cuposDisponibles: number;
}

/** Resultado del check-in de una boleta en el panel admin. */
export interface BoletaValidada {
  id: number;
  codigoQr: string;
  estado: "USADA";
  evento: { id: number; nombre: string; fecha: string; lugar: string; ciudad: string };
  localidad: string;
  comprador: { nombre: string; email: string };
  orden: { id: number; total: number; referenciaPago: string | null };
  validadaEn: string;
}

export interface ResumenAdmin {
  totalVentas: number;
  ingresos: number;
  boletasVendidas: number;
  aforoTotal: number;
  cuposDisponibles: number;
  eventos: EventoResumen[];
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