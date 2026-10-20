import type { Localidad } from "../types";
import { formatoCOP } from "../utils/formato";

const COLORES_ZONA = ["#8b7cf6", "#2dd4a3", "#fbbf24", "#fb7185", "#60a5fa", "#f472b6"];

/** Color de cada zona según su posición (el mapa y el panel usan el mismo). */
export function colorZona(indice: number) {
  return COLORES_ZONA[indice % COLORES_ZONA.length];
}

interface Props {
  zonas: Localidad[]; // ya ordenadas: de la más cara a la más barata
  seleccionada: number | null;
  onSeleccionar: (idLocalidad: number) => void;
}

export default function MapaLocalidades({ zonas, seleccionada, onSeleccionar }: Props) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 flex flex-col items-center gap-3">
      <div className="bg-black text-white text-xs font-bold uppercase tracking-widest px-10 py-2 rounded">
        Escenario
      </div>

      {zonas.map((loc, i) => {
        const agotada = loc.cuposDisponibles === 0;
        const ancho = 55 + (45 * (i + 1)) / zonas.length; // las zonas lejanas son más anchas
        const activa = seleccionada === loc.id;

        return (
          <button
            key={loc.id}
            type="button"
            disabled={agotada}
            onClick={() => onSeleccionar(loc.id)}
            style={{ width: `${ancho}%`, backgroundColor: colorZona(i) }}
            className={`h-16 rounded-lg text-navy-950 font-bold flex flex-col items-center justify-center transition
              ${activa ? "ring-4 ring-white scale-[1.02]" : "hover:opacity-90"}
              ${agotada ? "opacity-30 cursor-not-allowed" : ""}`}
          >
            <span>{loc.nombre}</span>
            <span className="text-xs font-medium">{agotada ? "Agotada" : formatoCOP(loc.precio)}</span>
          </button>
        );
      })}

      <p className="text-xs text-gray-400 mt-2">Mapa referencial</p>
    </div>
  );
}