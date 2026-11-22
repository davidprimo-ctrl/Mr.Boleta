import type { DatosLocalidad, Localidad, MapaId } from "../../types";

/** Paleta para los mapas genéricos (se repite si hay más localidades que colores). */
export const COLORES_ZONA = [
  "#f472b6", // rosa
  "#38bdf8", // celeste
  "#facc15", // amarillo
  "#34d399", // verde
  "#fb923c", // naranja
  "#a78bfa", // violeta
  "#2dd4bf", // turquesa
  "#f87171", // rojo
];

/** Color de una zona genérica según su posición. */
export function colorZona(indice: number) {
  return COLORES_ZONA[indice % COLORES_ZONA.length];
}

export interface ZonaPreset {
  codigo: string;
  nombre: string;
  color: string;
  precioSugerido: number;
  aforoSugerido: number;
  /** Secciones del plano que pertenecen a esta zona. */
  secciones: string[];
}

export interface MapaPreset {
  id: MapaId;
  nombre: string;
  descripcion: string;
  zonas: ZonaPreset[];
}

/**
 * Plano del Movistar Arena (Bogotá), con las mismas secciones y colores de la
 * referencia: platea 101-106, piso 2 (201-218) y piso 3 (303-317).
 * Los precios y aforos son sugerencias editables al crear el evento.
 */
export const ZONAS_MOVISTAR: ZonaPreset[] = [
  {
    codigo: "TFAN",
    nombre: "Tribuna Fan",
    color: "#8e44ec",
    precioSugerido: 350000,
    aforoSugerido: 300,
    secciones: ["TFAN"],
  },
  {
    codigo: "P102",
    nombre: "Platea (102)",
    color: "#e5007d",
    precioSugerido: 320000,
    aforoSugerido: 120,
    secciones: ["102"],
  },
  {
    codigo: "P101103",
    nombre: "Platea (101 y 103)",
    color: "#4b2ea3",
    precioSugerido: 300000,
    aforoSugerido: 240,
    secciones: ["101", "103"],
  },
  {
    codigo: "P104106",
    nombre: "Platea (104 - 106)",
    color: "#b45f06",
    precioSugerido: 260000,
    aforoSugerido: 180,
    secciones: ["104", "105", "106"],
  },
  {
    codigo: "PISO2A",
    nombre: "Piso 2 (201 - 205 y 215 - 218)",
    color: "#59cfa2",
    precioSugerido: 180000,
    aforoSugerido: 800,
    secciones: ["201", "202", "203", "204", "205", "215", "216", "217", "218"],
  },
  {
    codigo: "PISO2B",
    nombre: "Piso 2 (206 - 214)",
    color: "#f0502a",
    precioSugerido: 150000,
    aforoSugerido: 600,
    secciones: ["206", "207", "208", "209", "210", "211", "212", "213", "214"],
  },
  {
    codigo: "PISO3A",
    nombre: "Piso 3 (303 y 317)",
    color: "#ff8b80",
    precioSugerido: 120000,
    aforoSugerido: 300,
    secciones: ["303", "317"],
  },
  {
    codigo: "PISO3B",
    nombre: "Piso 3 (304 - 306 y 314 - 316)",
    color: "#1f4fd8",
    precioSugerido: 100000,
    aforoSugerido: 500,
    secciones: ["304", "305", "306", "314", "315", "316"],
  },
  {
    codigo: "PISO3C",
    nombre: "Piso 3 (307 - 313)",
    color: "#b8860b",
    precioSugerido: 80000,
    aforoSugerido: 700,
    secciones: ["307", "308", "309", "310", "311", "312", "313"],
  },
];

/**
 * Plano del Vive Claro, con las secciones de la referencia: LPU PIT, Platea 1,
 * Platea 2 y las sillas numeradas 101 a 132. Los precios y aforos son
 * sugerencias editables al crear el evento.
 */
export const ZONAS_VIVE_CLARO: ZonaPreset[] = [
  {
    codigo: "LPU",
    nombre: "LPU PIT (1 y 2)",
    color: "#8b0f1e",
    precioSugerido: 480000,
    aforoSugerido: 300,
    secciones: ["PIT1", "PIT2"],
  },
  {
    codigo: "PLATEA1",
    nombre: "Platea 1",
    color: "#7c0c1a",
    precioSugerido: 390000,
    aforoSugerido: 500,
    secciones: ["P1"],
  },
  {
    codigo: "PLATEA2",
    nombre: "Platea 2",
    color: "#ee7a6f",
    precioSugerido: 290000,
    aforoSugerido: 800,
    secciones: ["P2"],
  },
  {
    codigo: "BAJA",
    nombre: "Platea baja (101 - 108)",
    color: "#f2416c",
    precioSugerido: 320000,
    aforoSugerido: 700,
    secciones: ["101", "102", "103", "104", "105", "106", "107", "108"],
  },
  {
    codigo: "ALTA",
    nombre: "Platea alta (109 - 114)",
    color: "#f7941d",
    precioSugerido: 210000,
    aforoSugerido: 600,
    secciones: ["109", "110", "111", "112", "113", "114"],
  },
  {
    codigo: "ESQUINAS",
    nombre: "Esquinas (115 - 126)",
    color: "#f6c4a0",
    precioSugerido: 160000,
    aforoSugerido: 900,
    secciones: [
      "115", "116", "117", "118", "119", "120",
      "121", "122", "123", "124", "125", "126",
    ],
  },
  {
    codigo: "PREFERENCIAL",
    nombre: "Preferencial (127 - 128)",
    color: "#f6d55c",
    precioSugerido: 130000,
    aforoSugerido: 250,
    secciones: ["127", "128"],
  },
  {
    codigo: "GENERAL",
    nombre: "General (129 - 132)",
    color: "#e25b4a",
    precioSugerido: 95000,
    aforoSugerido: 450,
    secciones: ["129", "130", "131", "132"],
  },
];

export const MAPAS: Record<MapaId, MapaPreset> = {
  generico: {
    id: "generico",
    nombre: "Recinto genérico",
    descripcion: "Arena generada automáticamente a partir de tus localidades.",
    zonas: [],
  },
  "movistar-arena": {
    id: "movistar-arena",
    nombre: "Movistar Arena",
    descripcion: "Platea 101-106, piso 2 (201-218) y piso 3 (303-317), como el plano real.",
    zonas: ZONAS_MOVISTAR,
  },
  "vive-claro": {
    id: "vive-claro",
    nombre: "Vive Claro",
    descripcion: "LPU PIT, Platea 1 y 2, y sillas 101-132, como el plano real.",
    zonas: ZONAS_VIVE_CLARO,
  },
};

export function presetDe(mapa: MapaId | undefined): MapaPreset {
  return (mapa && MAPAS[mapa]) || MAPAS.generico;
}

/** Zona del preset a la que pertenece una localidad (por su código `zona`). */
export function zonaPreset(mapa: MapaId | undefined, codigo: string | null | undefined) {
  if (!codigo) return undefined;
  return presetDe(mapa).zonas.find((z) => z.codigo === codigo);
}

/** Nombre legible de una zona del plano (el código si no pertenece al preset). */
export function nombreZona(mapa: MapaId | undefined, codigo: string | null | undefined) {
  if (!codigo) return "";
  return zonaPreset(mapa, codigo)?.nombre ?? codigo;
}

/** Color de la localidad: el del plano preestablecido o el genérico por posición. */
export function colorDeLocalidad(
  localidad: Pick<Localidad, "zona">,
  indice: number,
  mapa: MapaId | undefined,
) {
  return zonaPreset(mapa, localidad.zona)?.color ?? colorZona(indice);
}

/** Localidades que se cargan al elegir un mapa preestablecido. */
export function localidadesSugeridas(mapa: MapaId): DatosLocalidad[] {
  return presetDe(mapa).zonas.map((z) => ({
    nombre: z.nombre,
    precio: z.precioSugerido,
    aforo: z.aforoSugerido,
    zona: z.codigo,
  }));
}

/** Localidades ficticias para dibujar la vista previa del mapa en el panel. */
export function localidadesDeVistaPrevia(mapa: MapaId): Localidad[] {
  const preset = presetDe(mapa);
  const zonas =
    preset.zonas.length > 0
      ? preset.zonas
      : [
          { codigo: "vip", nombre: "VIP", color: colorZona(0), precioSugerido: 200000, aforoSugerido: 100, secciones: [] },
          { codigo: "pref", nombre: "Preferencial", color: colorZona(1), precioSugerido: 150000, aforoSugerido: 200, secciones: [] },
          { codigo: "gen", nombre: "General", color: colorZona(2), precioSugerido: 80000, aforoSugerido: 300, secciones: [] },
        ];

  return zonas.map((z, i) => ({
    id: -1 - i,
    nombre: z.nombre,
    precio: String(z.precioSugerido),
    aforo: z.aforoSugerido,
    cuposDisponibles: z.aforoSugerido,
    zona: mapa === "generico" ? null : z.codigo,
    eventoId: 0,
  }));
}
