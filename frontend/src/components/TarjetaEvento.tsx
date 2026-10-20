import { Link } from "react-router";
import type { Evento } from "../types";
import { formatoCOP, formatoFecha } from "../utils/formato";

export default function TarjetaEvento({ evento }: { evento: Evento }) {
  const precios = evento.localidades.map((l) => Number(l.precio));
  const desde = precios.length > 0 ? Math.min(...precios) : null;
  const agotado = evento.localidades.every((l) => l.cuposDisponibles === 0);

  return (
    <Link
      to={`/eventos/${evento.id}`}
      className="group bg-navy-800 border border-navy-700 rounded-xl overflow-hidden
                 hover:border-brand-400 transition"
    >
      {evento.imagenUrl && (
        <img
          src={evento.imagenUrl}
          alt={evento.nombre}
          className="w-full aspect-video object-cover group-hover:opacity-90"
        />
      )}
      <div className="p-4">
        <p className="text-xs text-brand-400 uppercase font-semibold">{evento.ciudad}</p>
        <h3 className="text-lg font-bold mt-1">{evento.nombre}</h3>
        <p className="text-sm text-gray-400">{evento.artista}</p>
        <p className="text-sm text-gray-300 mt-2 first-letter:uppercase">{formatoFecha(evento.fecha)}</p>
        <p className="mt-3 font-semibold">
          {agotado ? (
            <span className="text-red-400">Agotado</span>
          ) : (
            desde !== null && <>Desde {formatoCOP(desde)}</>
          )}
        </p>
      </div>
    </Link>
  );
}