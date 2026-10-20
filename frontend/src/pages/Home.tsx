import { useEffect, useState } from "react";
import TarjetaEvento from "../components/TarjetaEvento";
import { obtenerEventos } from "../services/api";
import type { Evento } from "../types";

export default function Home() {
  const [busqueda, setBusqueda] = useState("");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Espera 300 ms después de la última tecla, para no llamar a la API en cada letra
    const espera = setTimeout(() => {
      setCargando(true);
      obtenerEventos(busqueda)
        .then((datos) => {
          setEventos(datos);
          setError("");
        })
        .catch(() => setError("No se pudieron cargar los eventos. ¿Está encendido el backend?"))
        .finally(() => setCargando(false));
    }, 300);

    return () => clearTimeout(espera);
  }, [busqueda]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
        Vive la música <span className="text-brand-400">en vivo</span>
      </h1>
      <p className="text-gray-300 mb-8">
        Encuentra conciertos y eventos musicales, y compra tus boletas en minutos.
      </p>

      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar artista, evento o ciudad..."
        className="w-full md:w-2/3 bg-navy-800 border border-navy-700 rounded-lg px-4 py-3
                   placeholder-gray-400 focus:outline-none focus:border-brand-400"
      />

      <section className="mt-10">
        {error && <p className="text-red-400">{error}</p>}
        {!error && cargando && <p className="text-gray-400">Cargando eventos...</p>}
        {!error && !cargando && eventos.length === 0 && (
          <p className="text-gray-400">No encontramos eventos para “{busqueda}”.</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {eventos.map((evento) => (
            <TarjetaEvento key={evento.id} evento={evento} />
          ))}
        </div>
      </section>
    </main>
  );
}