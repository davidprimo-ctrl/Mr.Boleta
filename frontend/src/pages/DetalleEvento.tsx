import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import MapaLocalidades from "../components/MapaLocalidades";
import { colorDeLocalidad } from "../components/mapas/presets";
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] mt-10 items-start">
        <MapaLocalidades
          zonas={zonas}
          seleccionada={seleccionada}
          onSeleccionar={seleccionar}
          mapa={evento.mapa}
        />

        <aside className="flex flex-col gap-4">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
            <h2 className="text-lg font-bold">Selecciona tu localidad</h2>
            <p className="text-sm text-gray-400 mt-1">
              Haz clic en una zona del mapa o elige una de la lista.
            </p>
          </div>

          <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
              Localidades y precios
            </h3>
            <ul className="mt-2 divide-y divide-navy-700">
              {zonas.map((loc, i) => {
                const agotada = loc.cuposDisponibles === 0;
                const activa = seleccionada === loc.id;
                return (
                  <li key={loc.id}>
                    <button
                      type="button"
                      disabled={agotada}
                      onClick={() => seleccionar(loc.id)}
                      aria-pressed={activa}
                      className={`w-full flex items-center gap-3 py-3 text-left transition
                        ${agotada ? "opacity-40 cursor-not-allowed" : "hover:opacity-80"}`}
                    >
                      <span
                        aria-hidden
                        style={activa ? { backgroundColor: colorDeLocalidad(loc, i, evento.mapa), borderColor: colorDeLocalidad(loc, i, evento.mapa) } : undefined}
                        className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center text-xs font-bold text-navy-950
                          ${activa ? "border-transparent" : "border-gray-500"}`}
                      >
                        {activa && "✓"}
                      </span>
                      <span
                        aria-hidden
                        style={{ backgroundColor: agotada ? "#6b7280" : colorDeLocalidad(loc, i, evento.mapa) }}
                        className="w-2.5 h-2.5 shrink-0 rounded-full"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold truncate">{loc.nombre}</span>
                        <span className="block text-xs text-gray-400">
                          {agotada ? "Agotada" : `${loc.cuposDisponibles} disponibles`}
                        </span>
                      </span>
                      <span className="text-sm font-semibold whitespace-nowrap">
                        {formatoCOP(loc.precio)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Resumen de la compra */}
          {localidad ? (
            <div className="bg-navy-800 border border-brand-500 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  style={{ backgroundColor: colorDeLocalidad(localidad, zonas.findIndex((l) => l.id === localidad.id), evento.mapa) }}
                  className="w-3 h-3 rounded-full"
                />
                <p className="font-bold">{localidad.nombre}</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {localidad.cuposDisponibles} cupos disponibles · máximo {maximo} por compra
              </p>

              <div className="flex items-end justify-between gap-4 mt-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCantidad((c) => Math.max(c - 1, 1))}
                    aria-label="Quitar una boleta"
                    className="w-9 h-9 rounded-lg bg-navy-700 hover:bg-navy-600 font-bold"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{cantidad}</span>
                  <button
                    type="button"
                    onClick={() => setCantidad((c) => Math.min(c + 1, maximo))}
                    aria-label="Agregar una boleta"
                    className="w-9 h-9 rounded-lg bg-brand-500 hover:bg-brand-400 font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400">Subtotal</p>
                  <p className="text-2xl font-bold">{formatoCOP(total)}</p>
                </div>
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
          ) : (
            <p className="text-sm text-gray-400 px-1">
              Elige una localidad en el mapa o en la lista para ver el resumen.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}