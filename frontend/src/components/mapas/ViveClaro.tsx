import type { ReactNode } from "react";
import type { Localidad } from "../../types";
import { zonaPreset } from "./presets";
import { formatoCOP } from "../../utils/formato";

const FONDO = "#0a0a0a";
const BORDE = "#d9d9d9";
const GRIS = "#6f6f74";
const VACIO = "#1b1b1e";
const AGOTADA = "#4b5563";

/**
 * Tonos por sección, para reproducir el degradado de las esquinas y los
 * contrastes de la referencia. Si una sección no está acá, se usa el color
 * de su zona (el mismo que muestra el panel de precios).
 */
const TONOS: Record<string, string> = {
  "107": "#f86f90",
  "108": "#f86f90",
  "115": "#f2b48c",
  "116": "#f2b48c",
  "117": "#f6c4a0",
  "118": "#f6c4a0",
  "119": "#f9d2b4",
  "120": "#f9d2b4",
  "121": "#fbddc6",
  "122": "#fbddc6",
  "123": "#fce7d6",
  "124": "#fce7d6",
  "125": "#fdf1e7",
  "126": "#fdf1e7",
  "129": "#e25b4a",
  "130": "#de5341",
  "131": "#e25b4a",
  "132": "#de5341",
};

const FILAS_LATERALES = [
  { y: 160, izquierda: "102", derecha: "101" },
  { y: 234, izquierda: "104", derecha: "103" },
  { y: 308, izquierda: "106", derecha: "105" },
  { y: 382, izquierda: "108", derecha: "107" },
  { y: 470, izquierda: "110", derecha: "109" },
  { y: 544, izquierda: "112", derecha: "111" },
  { y: 618, izquierda: "114", derecha: "113" },
];

const BLOQUES_BAJOS = [
  { codigo: "128", x: 270 },
  { codigo: "130", x: 348 },
  { codigo: "132", x: 426 },
  { codigo: "131", x: 504 },
  { codigo: "129", x: 582 },
  { codigo: "127", x: 660 },
];

interface Props {
  zonas: Localidad[]; // ya ordenadas: de la más cara a la más barata
  seleccionada: number | null;
  onSeleccionar: (idLocalidad: number) => void;
  className?: string;
}

interface Ocupada {
  localidad: Localidad;
  color: string;
  agotada: boolean;
}

interface Pintura {
  relleno: string;
  borde: string;
  grosor: number;
  activa: boolean;
}

interface Texto {
  x: number;
  y: number;
  tamano?: number;
  texto?: string;
}

const radianes = (grados: number) => (grados * Math.PI) / 180;

function punto(cx: number, cy: number, radio: number, angulo: number) {
  return `${(cx + radio * Math.cos(radianes(angulo))).toFixed(1)},${(cy + radio * Math.sin(radianes(angulo))).toFixed(1)}`;
}

/** Cuña con bordes rectos entre dos radios y dos ángulos (una esquina del plano). */
function cuña(cx: number, cy: number, r1: number, r2: number, a0: number, a1: number) {
  return [punto(cx, cy, r1, a0), punto(cx, cy, r2, a0), punto(cx, cy, r2, a1), punto(cx, cy, r1, a1)].join(" ");
}

/** Busca la localidad que ocupa cada sección del plano. */
function ocupacion(zonas: Localidad[]) {
  const porSeccion = new Map<string, Ocupada>();

  for (const localidad of zonas) {
    const zona = zonaPreset("vive-claro", localidad.zona);
    if (!zona) continue;
    for (const seccion of zona.secciones) {
      porSeccion.set(seccion, {
        localidad,
        color: zona.color,
        agotada: localidad.cuposDisponibles === 0,
      });
    }
  }

  return porSeccion;
}

export default function ViveClaro({ zonas, seleccionada, onSeleccionar, className }: Props) {
  const mapa = ocupacion(zonas);

  /** Pinta una sección (o la deja decorativa si ninguna localidad la usa). */
  const seccion = (
    codigo: string,
    forma: (p: Pintura) => ReactNode,
    texto?: Texto,
  ) => {
    const ocupada = mapa.get(codigo);
    const activa = Boolean(ocupada && seleccionada === ocupada.localidad.id);
    const relleno = ocupada ? (ocupada.agotada ? AGOTADA : TONOS[codigo] ?? ocupada.color) : VACIO;
    const borde = activa ? "#ffffff" : ocupada ? FONDO : "#2e2e33";
    const grosor = activa ? 3 : ocupada ? 2.5 : 1.5;

    const contenido = (
      <>
        {forma({ relleno, borde, grosor, activa })}
        {texto && (
          <text
            x={texto.x}
            y={texto.y}
            textAnchor="middle"
            fontSize={texto.tamano ?? 16}
            fontWeight="700"
            fill={ocupada ? "#ffffff" : "#5f5f66"}
            pointerEvents="none"
          >
            {texto.texto ?? codigo}
          </text>
        )}
      </>
    );

    if (!ocupada) {
      return (
        <g key={codigo} aria-hidden pointerEvents="none">
          {contenido}
        </g>
      );
    }

    return (
      <g
        key={codigo}
        role="button"
        tabIndex={ocupada.agotada ? -1 : 0}
        aria-label={`${ocupada.localidad.nombre}, ${formatoCOP(ocupada.localidad.precio)}${
          ocupada.agotada ? ", agotada" : `, ${ocupada.localidad.cuposDisponibles} cupos disponibles`
        }`}
        aria-pressed={activa}
        onClick={() => !ocupada.agotada && onSeleccionar(ocupada.localidad.id)}
        onKeyDown={(e) => {
          if (ocupada.agotada) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSeleccionar(ocupada.localidad.id);
          }
        }}
        className={`transition-opacity ${
          ocupada.agotada ? "cursor-not-allowed" : "cursor-pointer hover:opacity-80"
        }`}
      >
        <title>
          {`${ocupada.localidad.nombre} · ${formatoCOP(ocupada.localidad.precio)}${
            ocupada.agotada ? " · Agotada" : ` · ${ocupada.localidad.cuposDisponibles} disponibles`
          }`}
        </title>
        {contenido}
      </g>
    );
  };

  const rect = (x: number, y: number, ancho: number, alto: number, rx = 2) =>
    ({ relleno, borde, grosor, activa }: Pintura) => (
      <>
        <rect x={x} y={y} width={ancho} height={alto} rx={rx} fill={relleno} stroke={borde} strokeWidth={grosor} />
        {activa && (
          <rect
            x={x}
            y={y}
            width={ancho}
            height={alto}
            rx={rx}
            fill="#ffffff"
            fillOpacity={0.18}
            stroke="#ffffff"
            strokeWidth={3}
            pointerEvents="none"
          />
        )}
      </>
    );

  const poly = (puntos: string) =>
    ({ relleno, borde, grosor, activa }: Pintura) => (
      <>
        <polygon points={puntos} fill={relleno} stroke={borde} strokeWidth={grosor} />
        {activa && (
          <polygon
            points={puntos}
            fill="#ffffff"
            fillOpacity={0.18}
            stroke="#ffffff"
            strokeWidth={3}
            pointerEvents="none"
          />
        )}
      </>
    );

  const cuna = (cx: number, cy: number, r1: number, r2: number, a0: number, a1: number) =>
    poly(cuña(cx, cy, r1, r2, a0, a1));

  return (
    <svg
      viewBox="0 0 1000 900"
      role="img"
      aria-label="Plano del Vive Claro: LPU PIT, plateas y sillas 101 a 132"
      className={className ?? "w-full h-auto select-none"}
    >
      <rect width="1000" height="900" rx="18" fill={FONDO} />

      {/* Espacio */}
      <g pointerEvents="none">
        <rect x={200} y={40} width={600} height={120} fill={FONDO} stroke={BORDE} strokeWidth={2} />
        <text
          x={500}
          y={110}
          textAnchor="middle"
          fontSize="20"
          fontWeight="800"
          letterSpacing="6"
          fill="#e8e8ee"
        >
          STAGE
        </text>
      </g>

      {/* Platea 1 y Platea 2 (debajo de las pistas y del escenario) */}
      {seccion("P1", rect(200, 230, 600, 170), { x: 500, y: 337, tamano: 20, texto: "PLATEA 1" })}
      {seccion("P2", rect(200, 400, 600, 290), { x: 500, y: 553, tamano: 20, texto: "PLATEA 2" })}

      {/* Pasillos laterales */}
      <g pointerEvents="none" aria-hidden>
        <rect x={152} y={160} width={41} height={295} fill={GRIS} stroke={FONDO} strokeWidth={3} />
        <rect x={807} y={160} width={41} height={295} fill={GRIS} stroke={FONDO} strokeWidth={3} />
      </g>

      {/* Sillas laterales 101-114 */}
      {FILAS_LATERALES.map(({ y, izquierda, derecha }) => (
        <g key={y}>
          {seccion(izquierda, rect(30, y, 115, 62), { x: 87, y: y + 39 })}
          {seccion(derecha, rect(855, y, 115, 62), { x: 912, y: y + 39 })}
        </g>
      ))}

      {/* LPU PIT 1 y 2 */}
      {seccion("PIT2", poly("200,160 450,160 450,230 340,230 310,270 200,270"), {
        x: 325,
        y: 212,
        tamano: 17,
        texto: "LPU PIT 2",
      })}
      {seccion("PIT1", poly("550,160 800,160 800,270 690,270 660,230 550,230"), {
        x: 675,
        y: 212,
        tamano: 17,
        texto: "*LPU PIT 1",
      })}

      {/* Tarima central que baja del escenario */}
      <g pointerEvents="none" aria-hidden>
        <rect x={450} y={160} width={100} height={130} fill={FONDO} stroke={BORDE} strokeWidth={2} />
      </g>

      {/* Esquinas curvas 115-126 */}
      {seccion("116", cuna(250, 675, 50, 195, 158, 172), { x: 91, y: 721, tamano: 13 })}
      {seccion("118", cuna(250, 675, 50, 195, 144, 158), { x: 106, y: 760, tamano: 13 })}
      {seccion("120", cuna(250, 675, 50, 195, 130, 144), { x: 129, y: 791, tamano: 13 })}
      {seccion("122", cuna(250, 675, 50, 195, 116, 130), { x: 160, y: 817, tamano: 13 })}
      {seccion("124", cuna(250, 675, 50, 195, 102, 116), { x: 196, y: 835, tamano: 13 })}
      {seccion("126", cuna(250, 675, 50, 195, 88, 102), { x: 236, y: 843, tamano: 13 })}

      {seccion("115", cuna(750, 675, 50, 195, 8, 22), { x: 909, y: 721, tamano: 13 })}
      {seccion("117", cuna(750, 675, 50, 195, 22, 36), { x: 894, y: 760, tamano: 13 })}
      {seccion("119", cuna(750, 675, 50, 195, 36, 50), { x: 871, y: 791, tamano: 13 })}
      {seccion("121", cuna(750, 675, 50, 195, 50, 64), { x: 840, y: 817, tamano: 13 })}
      {seccion("123", cuna(750, 675, 50, 195, 64, 78), { x: 804, y: 835, tamano: 13 })}
      {seccion("125", cuna(750, 675, 50, 195, 78, 92), { x: 764, y: 843, tamano: 13 })}

      {/* Bloques bajos 127-132 */}
      {BLOQUES_BAJOS.map(({ codigo, x }) => (
        <g key={codigo}>{seccion(codigo, rect(x, 770, 62, 110), { x: x + 31, y: 833 })}</g>
      ))}
    </svg>
  );
}
