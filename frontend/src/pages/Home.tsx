export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
        Vive la música <span className="text-brand-400">en vivo</span>
      </h1>
      <p className="text-gray-300 mb-8">
        Encuentra conciertos y eventos musicales, y compra tus boletas en minutos.
      </p>

      {/* Buscador (por ahora solo visual; se conecta en el turno del catálogo) */}
      <input
        type="text"
        placeholder="Buscar artista, evento o ciudad..."
        className="w-full md:w-2/3 bg-navy-800 border border-navy-700 rounded-lg px-4 py-3
                   placeholder-gray-400 focus:outline-none focus:border-brand-400"
      />
    </main>
  );
}