import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import MapaLocalidades, { colorZona } from "../components/MapaLocalidades";
import { crearOrden, obtenerEvento } from "../services/api";
import type { Evento } from "../types";
import { formatoCOP, formatoFecha } from "../utils/formato";

const MAX_BOLETAS = 10;

export default function DetalleEvento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loginWithRedirect, getAccessTokenSilently } = useAuth0();

  const [evento, setEvento] = useState<Evento | null>(null);
  const [error, setError] = useState("");
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [comprando, setComprando] = useState(false);
  const [errorCompra, setErrorCompra] = useState("");

  useEffect(() => {
    if (!id) return;
    obtenerEvento(id)
      .then(setEvento)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <Link to="/" className="text-brand-400 hover:underline">← Volver al catálogo</Link>
      </main>
    );
  }

  if (!evento) {
    return <p className="max-w-6xl mx-auto px-4 py-12 text-gray-400">Cargando evento...</p>;
  }

  // Zonas de la más cara (junto al escenario) a la más barata
  const zonas = [...evento.localidades].sort((a, b) => Number(b.precio) - Number(a.precio));
  const localidad = zonas.find((l) => l.id === seleccionada) ?? null;
  const maximo = localidad ? Math.min(localidad.cuposDisponibles, MAX_BOLETAS) : 1;
  const total = localidad ? Number(localidad.precio) * cantidad : 0;

  function seleccionar(idLocalidad: number) {
    setSeleccionada(idLocalidad);
    setCantidad(1);
    setErrorCompra("");
  }

  async function comprar() {
    if (!evento || !localidad) return;

    // Sin sesión: ir a iniciar sesión y volver a este evento
    if (!isAuthenticated) {
      await loginWithRedirect({ appState: { returnTo: `/eventos/${evento.id}` } });
      return;
    }

    setComprando(true);
    setErrorCompra("");
    try {
      const token = await getAccessTokenSilently();
      if (!token) throw new Error("No se obtuvo el token de Auth0");
      const orden = await crearOrden(token, evento.id, [{ localidadId: localidad.id, cantidad }]);
      navigate(`/ordenes/${orden.id}`);
    } catch (e) {
      setErrorCompra((e as Error).message);
      setComprando(false);
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <Link to="/" className="text-brand-400 hover:underline text-sm">← Volver al catálogo</Link>

      {/* Encabezado del evento */}
      <div className="flex flex-col md:flex-row gap-6 mt-4">
        {evento.imagenUrl && (
          <img
            src={evento.imagenUrl}
            alt={evento.nombre}
            className="w-full md:w-80 aspect-video object-cover rounded-xl"
          />
        )}
        <div>
          <p className="text-brand-400 uppercase text-sm font-semibold">
            {evento.lugar} · {evento.ciudad}
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-1">{evento.nombre}</h1>
          <p className="text-gray-400">{evento.artista}</p>
          <p className="text-gray-300 mt-2 first-letter:uppercase">{formatoFecha(evento.fecha)}</p>
          <p className="text-gray-300 mt-3">{evento.descripcion}</p>
        </div>
      </div>

      {/* Mapa + panel */}
      <div className="grid gap-6 md:grid-cols-[3fr_2fr] mt-10">
        <MapaLocalidades zonas={zonas} seleccionada={seleccionada} onSeleccionar={seleccionar} />

        <aside className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Selecciona tu localidad</h2>

          {zonas.map((loc, i) => {
            const agotada = loc.cuposDisponibles === 0;
            return (
              <button
                key={loc.id}
                type="button"
                disabled={agotada}
                onClick={() => seleccionar(loc.id)}
                style={{ borderLeftColor: colorZona(i) }}
                className={`text-left border border-navy-700 border-l-4 rounded-lg p-4 transition disabled:opacity-40
                  ${seleccionada === loc.id ? "bg-navy-700" : "bg-navy-800 hover:bg-navy-700"}`}
              >
                <p className="font-semibold">{loc.nombre}</p>
                <p className="text-brand-400">{formatoCOP(loc.precio)}</p>
                <p className="text-xs text-gray-400">
                  {agotada ? "Agotada" : `${loc.cuposDisponibles} disponibles`}
                </p>
              </button>
            );
          })}

          {/* Resumen de la compra */}
          {localidad && (
            <div className="bg-navy-800 border border-brand-500 rounded-lg p-4 mt-2">
              <p className="text-sm text-gray-400">Localidad elegida</p>
              <p className="font-bold text-lg">{localidad.nombre}</p>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCantidad((c) => Math.max(c - 1, 1))}
                    className="w-9 h-9 rounded-lg bg-navy-700"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{cantidad}</span>
                  <button
                    type="button"
                    onClick={() => setCantidad((c) => Math.min(c + 1, maximo))}
                    className="w-9 h-9 rounded-lg bg-brand-500 hover:bg-brand-400"
                  >
                    +
                  </button>
                </div>
                <p className="text-2xl font-bold">{formatoCOP(total)}</p>
              </div>

              <button
                type="button"
                onClick={comprar}
                disabled={comprando}
                className="w-full mt-4 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 py-3 rounded-lg font-semibold"
              >
                {comprando ? "Reservando..." : isAuthenticated ? "Comprar" : "Inicia sesión para comprar"}
              </button>
              {errorCompra && <p className="text-red-400 text-sm mt-3">{errorCompra}</p>}
              <p className="text-xs text-gray-400 mt-3">
                Tus boletas quedan reservadas 10 minutos mientras completas el pago.
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}