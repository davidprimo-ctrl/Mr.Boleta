import { useMemo, useState } from "react";
import type { Localidad } from "../types";
import { formatoCOP } from "../utils/formato";

/** Paleta de las zonas (se repite si hay más localidades que colores). */
const COLORES_ZONA = [
  "#f472b6", // rosa
  "#38bdf8", // celeste
  "#facc15", // amarillo
  "#34d399", // verde
  "#fb923c", // naranja
  "#a78bfa", // violeta
  "#2dd4bf", // turquesa
  "#f87171", // rojo
];

/** Color de cada zona según su posición (el mapa y el panel usan el mismo). */
export function colorZona(indice: number) {
  return COLORES_ZONA[indice % COLORES_ZONA.length];
}

const CX = 440;
const CY = 400;
const RX_EXTERIOR = 350;
const RY_EXTERIOR = 255;
const RX_INTERIOR = 182;
const RY_INTERIOR = 110;

interface Props {
  zonas: Localidad[]; // ya ordenadas: de la más cara a la más barata
  seleccionada: number | null;
  onSeleccionar: (idLocalidad: number) => void;
}

interface Segmento {
  clave: string;
  d: string;
  zona: Localidad;
  indiceZona: number;
  agotada: boolean;
}

/** Punto de una elipse para un ángulo dado. */
function punto(rx: number, ry: number, angulo: number) {
  return `${(CX + rx * Math.cos(angulo)).toFixed(1)} ${(CY + ry * Math.sin(angulo)).toFixed(1)}`;
}

/** Sector de corona elíptica (una sección del recinto). */
function sector(a0: number, a1: number) {
  const grande = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${punto(RX_EXTERIOR, RY_EXTERIOR, a0)}`,
    `A ${RX_EXTERIOR} ${RY_EXTERIOR} 0 ${grande} 1 ${punto(RX_EXTERIOR, RY_EXTERIOR, a1)}`,
    `L ${punto(RX_INTERIOR, RY_INTERIOR, a1)}`,
    `A ${RX_INTERIOR} ${RY_INTERIOR} 0 ${grande} 0 ${punto(RX_INTERIOR, RY_INTERIOR, a0)}`,
    "Z",
  ].join(" ");
}

/**
 * Reparte el anillo del recinto en secciones contiguas por localidad.
 * Se empieza arriba (junto al escenario) y se avanza en sentido horario,
 * así las localidades más caras quedan más cerca del escenario.
 */
function repartirSegmentos(zonas: Localidad[]): Segmento[] {
  if (zonas.length === 0) return [];

  const total = Math.max(12, Math.min(24, zonas.length * 2));
  const base = Math.floor(total / zonas.length);
  const sobrantes = total % zonas.length;
  const cantidad = zonas.map((_, i) => base + (i < sobrantes ? 1 : 0));

  const hueco = 0.02; // separación entre secciones, en radianes
  let cursor = -Math.PI / 2;
  const segmentos: Segmento[] = [];

  zonas.forEach((zona, indiceZona) => {
    const arcoZona = (Math.PI * 2 * cantidad[indiceZona]) / total;
    const arcoSeccion = arcoZona / cantidad[indiceZona];

    for (let j = 0; j < cantidad[indiceZona]; j++) {
      segmentos.push({
        clave: `${zona.id}-${j}`,
        d: sector(cursor + hueco / 2, cursor + arcoSeccion - hueco / 2),
        zona,
        indiceZona,
        agotada: zona.cuposDisponibles === 0,
      });
      cursor += arcoSeccion;
    }
    cursor += hueco;
  });

  return segmentos;
}

export default function MapaLocalidades({ zonas, seleccionada, onSeleccionar }: Props) {
  const [zoom, setZoom] = useState(1);
  const segmentos = useMemo(() => repartirSegmentos(zonas), [zonas]);
  const hayAgotadas = zonas.some((z) => z.cuposDisponibles === 0);

  return (
    <div className="relative bg-navy-800 border border-navy-700 rounded-xl p-4 md:p-6">
      {/* Controles del mapa */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.2).toFixed(1))))}
          disabled={zoom >= 1.8}
          aria-label="Acercar el mapa"
          className="w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-400 disabled:opacity-40 shadow-lg shadow-brand-500/30 font-bold text-lg leading-none"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(1))))}
          disabled={zoom <= 1}
          aria-label="Alejar el mapa"
          className="w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-400 disabled:opacity-40 shadow-lg shadow-brand-500/30 font-bold text-lg leading-none"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          disabled={zoom === 1}
          aria-label="Restablecer el mapa"
          className="w-9 h-9 rounded-full bg-navy-700 hover:bg-navy-600 disabled:opacity-40 shadow-lg text-base leading-none"
        >
          ⟲
        </button>
      </div>

      <div className="overflow-auto max-h-[80vh]">
        <div style={{ width: `${zoom * 100}%` }} className="mx-auto">
          <svg
            viewBox="0 0 880 740"
            role="img"
            aria-label="Mapa referencial del recinto con las localidades disponibles"
            className="w-full h-auto select-none"
          >
          <defs>
            {zonas.map((zona, i) => {
              const color = zona.cuposDisponibles === 0 ? "#94a3b8" : colorZona(i);
              return (
                <pattern
                  key={zona.id}
                  id={`asientos-${i}`}
                  width="9"
                  height="8"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="2" cy="2" r="1.15" fill={color} />
                  <circle cx="6.5" cy="6" r="1.15" fill={color} />
                </pattern>
              );
            })}
          </defs>

          <g>
            {/* Base del recinto */}
            <ellipse
              cx={CX}
              cy={CY}
              rx={RX_EXTERIOR + 16}
              ry={RY_EXTERIOR + 18}
              fill="#070e22"
              stroke="#1a2a57"
              strokeWidth="2"
            />

            {/* Secciones del anillo */}
            {segmentos.map((s) => {
              const color = colorZona(s.indiceZona);
              const activa = seleccionada === s.zona.id;
              return (
                <g
                  key={s.clave}
                  role="button"
                  tabIndex={s.agotada ? -1 : 0}
                  aria-label={`${s.zona.nombre}, ${formatoCOP(s.zona.precio)}${
                    s.agotada ? ", agotada" : `, ${s.zona.cuposDisponibles} cupos disponibles`
                  }`}
                  aria-pressed={activa}
                  onClick={() => !s.agotada && onSeleccionar(s.zona.id)}
                  onKeyDown={(e) => {
                    if (s.agotada) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSeleccionar(s.zona.id);
                    }
                  }}
                  className={`transition-opacity ${
                    s.agotada ? "cursor-not-allowed" : "cursor-pointer hover:opacity-75"
                  }`}
                >
                  <title>
                    {`${s.zona.nombre} · ${formatoCOP(s.zona.precio)}${
                      s.agotada ? " · Agotada" : ` · ${s.zona.cuposDisponibles} disponibles`
                    }`}
                  </title>
                  <path
                    d={s.d}
                    fill={s.agotada ? "#94a3b8" : color}
                    fillOpacity={s.agotada ? 0.06 : 0.16}
                    stroke={s.agotada ? "#64748b" : color}
                    strokeWidth={activa ? 2.4 : 1}
                  />
                  <path
                    d={s.d}
                    fill={`url(#asientos-${s.indiceZona})`}
                    opacity={s.agotada ? 0.25 : 0.9}
                    pointerEvents="none"
                  />
                  {activa && (
                    <path
                      d={s.d}
                      fill="#ffffff"
                      fillOpacity={0.12}
                      stroke="#ffffff"
                      strokeWidth={2}
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}

            {/* Piso central: la localidad más costosa */}
            {zonas[0] && (
              <>
                <clipPath id="piso-central">
                  <ellipse cx={CX} cy={CY} rx={RX_INTERIOR - 8} ry={RY_INTERIOR - 6} />
                </clipPath>
                <g
                  clipPath="url(#piso-central)"
                  role="button"
                  tabIndex={zonas[0].cuposDisponibles === 0 ? -1 : 0}
                  aria-label={`${zonas[0].nombre}, ${formatoCOP(zonas[0].precio)}${
                    zonas[0].cuposDisponibles === 0
                      ? ", agotada"
                      : `, ${zonas[0].cuposDisponibles} cupos disponibles`
                  }`}
                  aria-pressed={seleccionada === zonas[0].id}
                  onClick={() => zonas[0].cuposDisponibles > 0 && onSeleccionar(zonas[0].id)}
                  onKeyDown={(e) => {
                    if (zonas[0].cuposDisponibles === 0) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSeleccionar(zonas[0].id);
                    }
                  }}
                  className={
                    zonas[0].cuposDisponibles === 0
                      ? "cursor-not-allowed"
                      : "cursor-pointer hover:opacity-75"
                  }
                >
                  <title>{`${zonas[0].nombre} · ${formatoCOP(zonas[0].precio)}`}</title>
                  {[-1, 1].map((lado) => {
                    const ancho = RX_INTERIOR - 14;
                    const x = lado === -1 ? CX - ancho : CX + 6;
                    const color = colorZona(0);
                    return (
                      <g key={lado}>
                        <rect
                          x={x}
                          y={CY - RY_INTERIOR}
                          width={ancho}
                          height={RY_INTERIOR * 2}
                          rx={8}
                          fill={zonas[0].cuposDisponibles === 0 ? "#94a3b8" : color}
                          fillOpacity={zonas[0].cuposDisponibles === 0 ? 0.06 : 0.16}
                          stroke={zonas[0].cuposDisponibles === 0 ? "#64748b" : color}
                          strokeWidth={seleccionada === zonas[0].id ? 2.4 : 1}
                        />
                        <rect
                          x={x}
                          y={CY - RY_INTERIOR}
                          width={ancho}
                          height={RY_INTERIOR * 2}
                          rx={8}
                          fill="url(#asientos-0)"
                          opacity={zonas[0].cuposDisponibles === 0 ? 0.25 : 0.9}
                          pointerEvents="none"
                        />
                        {seleccionada === zonas[0].id && (
                          <rect
                            x={x}
                            y={CY - RY_INTERIOR}
                            width={ancho}
                            height={RY_INTERIOR * 2}
                            rx={8}
                            fill="#ffffff"
                            fillOpacity={0.12}
                            stroke="#ffffff"
                            strokeWidth={2}
                            pointerEvents="none"
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              </>
            )}

            {/* Escenario */}
            <g pointerEvents="none">
              <rect
                x={CX - 140}
                y={CY - RY_EXTERIOR - 30}
                width={280}
                height={56}
                rx={8}
                fill="#cbd5e1"
              />
              <text
                x={CX}
                y={CY - RY_EXTERIOR + 6}
                textAnchor="middle"
                fill="#0b1530"
                fontSize="18"
                fontWeight="800"
                letterSpacing="7"
              >
                ESCENARIO
              </text>
            </g>
          </g>
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-400 mt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
          Disponible
        </span>
        {hayAgotadas && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            Agotada
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white ring-2 ring-white/60" />
          Seleccionada
        </span>
        <span className="ml-auto">Mapa referencial · los asientos no se eligen individualmente</span>
      </div>
    </div>
  );
}
