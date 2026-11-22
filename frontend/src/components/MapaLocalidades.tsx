import { useMemo, useState } from "react";
import type { Localidad, MapaId } from "../types";
import MapaGenerico from "./mapas/MapaGenerico";
import MovistarArena from "./mapas/MovistarArena";
import { presetDe } from "./mapas/presets";

interface Props {
  zonas: Localidad[]; // ya ordenadas: de la más cara a la más barata
  seleccionada: number | null;
  onSeleccionar: (idLocalidad: number) => void;
  /** Plano preestablecido del recinto. */
  mapa?: MapaId;
}

export default function MapaLocalidades({ zonas, seleccionada, onSeleccionar, mapa }: Props) {
  const [zoom, setZoom] = useState(1);
  const preset = presetDe(mapa);
  // El plano preestablecido solo se usa si las localidades traen código de zona.
  const usaPreset = useMemo(
    () => preset.zonas.length > 0 && zonas.some((z) => z.zona !== null && z.zona !== undefined),
    [preset, zonas],
  );
  const hayAgotadas = zonas.some((z) => z.cuposDisponibles === 0);
  const alto = usaPreset ? "70vh" : "80vh";

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

      <div className="overflow-auto" style={{ maxHeight: alto }}>
        <div style={{ width: `${zoom * 100}%` }} className="mx-auto">
          {usaPreset ? (
            <MovistarArena
              zonas={zonas}
              seleccionada={seleccionada}
              onSeleccionar={onSeleccionar}
              className="w-full h-auto select-none"
            />
          ) : (
            <MapaGenerico
              zonas={zonas}
              seleccionada={seleccionada}
              onSeleccionar={onSeleccionar}
              className="w-full h-auto select-none"
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-400 mt-3">
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
        <span className="ml-auto">
          {usaPreset ? `Plano: ${preset.nombre}` : "Mapa referencial"} · los asientos no se eligen
          individualmente
        </span>
      </div>
    </div>
  );
}
