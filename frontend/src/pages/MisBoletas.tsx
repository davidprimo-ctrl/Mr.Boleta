import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import TarjetaBoleta from "../components/TarjetaBoleta";
import { obtenerMisOrdenes } from "../services/api";
import type { EstadoOrden, Orden } from "../types";
import { formatoCOP, formatoFecha } from "../utils/formato";

const ESTADOS: Record<EstadoOrden, { texto: string; clase: string }> = {
  PENDIENTE: { texto: "Pendiente de pago", clase: "bg-yellow-500/20 text-yellow-300" },
  APROBADA: { texto: "Pagada", clase: "bg-green-500/20 text-green-300" },
  RECHAZADA: { texto: "Pago rechazado", clase: "bg-red-500/20 text-red-300" },
  EXPIRADA: { texto: "Reserva vencida", clase: "bg-gray-500/20 text-gray-300" },
};

export default function MisBoletas() {
  const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const [ordenes, setOrdenes] = useState<Orden[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    getAccessTokenSilently()
      .then((token) => {
        if (!token) throw new Error("No se obtuvo el token de Auth0");
        return obtenerMisOrdenes(token);
      })
      .then(setOrdenes)
      .catch((e: Error) => setError(e.message));
  }, [isAuthenticated, isLoading, getAccessTokenSilently]);

  if (!isLoading && !isAuthenticated) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold mb-4">Mis boletas</h1>
        <p className="text-gray-300 mb-6">Inicia sesión para ver las boletas que has comprado.</p>
        <button
          type="button"
          onClick={() => loginWithRedirect({ appState: { returnTo: "/mis-boletas" } })}
          className="bg-brand-500 hover:bg-brand-400 px-6 py-3 rounded-lg font-semibold"
        >
          Iniciar sesión
        </button>
      </main>
    );
  }
  if (error) {
    return <p className="max-w-4xl mx-auto px-4 py-12 text-red-400">{error}</p>;
  }
  if (!ordenes) {
    return <p className="max-w-4xl mx-auto px-4 py-12 text-gray-400">Cargando tus boletas...</p>;
  }

  const ahora = new Date();
  const pagadas = ordenes.filter((o) => o.estado === "APROBADA");
  const proximas = pagadas.filter((o) => new Date(o.evento.fecha) >= ahora);
  const pasadas = pagadas.filter((o) => new Date(o.evento.fecha) < ahora);
  const otras = ordenes.filter((o) => o.estado !== "APROBADA");

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl md:text-4xl font-extrabold">Mis boletas</h1>

      {ordenes.length === 0 && (
        <div className="mt-8 bg-navy-800 border border-navy-700 rounded-xl p-8 text-center">
          <p className="text-gray-300 mb-4">Todavía no has comprado boletas.</p>
          <Link to="/" className="text-brand-400 hover:underline">Explorar eventos →</Link>
        </div>
      )}

      {/* Próximos eventos: las boletas para usar */}
      {proximas.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-4">Próximos eventos</h2>
          <div className="space-y-6">
            {proximas.map((orden) => (
              <article key={orden.id} className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-2xl font-bold">{orden.evento.nombre}</h3>
                    <p className="text-gray-300 first-letter:uppercase">{formatoFecha(orden.evento.fecha)}</p>
                    <p className="text-gray-400 text-sm">
                      {orden.evento.lugar} · {orden.evento.ciudad}
                    </p>
                  </div>
                  <Link to={`/ordenes/${orden.id}`} className="text-brand-400 hover:underline text-sm">
                    Orden #{orden.id} →
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-5">
                  {orden.detalles.flatMap((d) =>
                    d.boletas.map((boleta, i) => (
                      <TarjetaBoleta key={boleta.id} boleta={boleta} localidad={d.localidad.nombre} numero={i + 1} />
                    )),
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Historial: eventos pasados y órdenes no pagadas */}
      {(pasadas.length > 0 || otras.length > 0) && (
        <section className="mt-10">
          <h2 className="text-xl font-bold mb-4">Historial de compras</h2>
          <div className="bg-navy-800 border border-navy-700 rounded-xl divide-y divide-navy-700">
            {[...pasadas, ...otras].map((orden) => {
              const estado = pasadas.includes(orden)
                ? { texto: "Evento finalizado", clase: "bg-gray-500/20 text-gray-300" }
                : ESTADOS[orden.estado];
              return (
                <Link
                  key={orden.id}
                  to={`/ordenes/${orden.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-navy-700"
                >
                  <div>
                    <p className="font-semibold">{orden.evento.nombre}</p>
                    <p className="text-sm text-gray-400">
                      Orden #{orden.id} · {formatoCOP(orden.total)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${estado.clase}`}>
                    {estado.texto}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}