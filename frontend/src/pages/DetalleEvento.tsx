import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { obtenerEvento } from "../services/api";
import type { Evento, Localidad } from "../types";
import { formatoCOP, formatoFecha } from "../utils/formato";

const MAX_POR_LOCALIDAD = 10;

export default function DetalleEvento() {
  const { id } = useParams(); // el número que viene en la URL: /eventos/:id
  const [evento, setEvento] = useState<Evento | null>(null);
  const [error, setError] = useState("");
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!id) return;
    obtenerEvento(id)
      .then(setEvento)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <Link to="/" className="text-brand-400 hover:underline">← Volver al catálogo</Link>
      </main>
    );
  }

  if (!evento) {
    return <p className="max-w-4xl mx-auto px-4 py-12 text-gray-400">Cargando evento...</p>;
  }

  function cambiarCantidad(localidad: Localidad, cambio: number) {
    setCantidades((anteriores) => {
      const maximo = Math.min(localidad.cuposDisponibles, MAX_POR_LOCALIDAD);
      const nueva = Math.min(Math.max((anteriores[localidad.id] ?? 0) + cambio, 0), maximo);
      return { ...anteriores, [localidad.id]: nueva };
    });
  }

  const totalBoletas = Object.values(cantidades).reduce((suma, c) => suma + c, 0);
  const totalPagar = evento.localidades.reduce(
    (suma, l) => suma + Number(l.precio) * (cantidades[l.id] ?? 0),
    0,
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <Link to="/" className="text-brand-400 hover:underline text-sm">← Volver al catálogo</Link>

      {evento.imagenUrl && (
        <img
          src={evento.imagenUrl}
          alt={evento.nombre}
          className="w-full aspect-video object-cover rounded-xl mt-4"
        />
      )}

      <p className="text-brand-400 uppercase text-sm font-semibold mt-6">
        {evento.lugar} · {evento.ciudad}
      </p>
      <h1 className="text-3xl md:text-4xl font-extrabold mt-1">{evento.nombre}</h1>
      <p className="text-gray-400">{evento.artista}</p>
      <p className="text-gray-300 mt-2 first-letter:uppercase">{formatoFecha(evento.fecha)}</p>
      <p className="text-gray-300 mt-4">{evento.descripcion}</p>

      <h2 className="text-xl font-bold mt-10 mb-4">Elige tu localidad</h2>
      <div className="space-y-3">
        {evento.localidades.map((loc) => {
          const cantidad = cantidades[loc.id] ?? 0;
          const agotada = loc.cuposDisponibles === 0;
          return (
            <div
              key={loc.id}
              className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-lg p-4"
            >
              <div>
                <p className="font-semibold">{loc.nombre}</p>
                <p className="text-brand-400">{formatoCOP(loc.precio)}</p>
                <p className="text-xs text-gray-400">
                  {agotada ? "Agotada" : `${loc.cuposDisponibles} disponibles`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => cambiarCantidad(loc, -1)}
                  disabled={cantidad === 0}
                  className="w-9 h-9 rounded-lg bg-navy-700 disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold">{cantidad}</span>
                <button
                  onClick={() => cambiarCantidad(loc, +1)}
                  disabled={agotada}
                  className="w-9 h-9 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-navy-700 pt-6">
        <div>
          <p className="text-gray-400 text-sm">{totalBoletas} boleta(s)</p>
          <p className="text-2xl font-bold">{formatoCOP(totalPagar)}</p>
        </div>
        <button
          disabled={totalBoletas === 0}
          onClick={() => setAviso("Muy pronto: inicia sesión con Google para comprar.")}
          className="bg-brand-500 hover:bg-brand-400 disabled:opacity-40 px-6 py-3 rounded-lg font-semibold"
        >
          Comprar
        </button>
      </div>
      {aviso && <p className="text-brand-400 mt-4 text-right">{aviso}</p>}
    </main>
  );
}