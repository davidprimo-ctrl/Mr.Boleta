export default function Navbar() {
  return (
    <nav className="bg-navy-950 border-b border-navy-700">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="text-2xl font-extrabold tracking-tight">
          Mr.<span className="text-brand-400">Boleta</span>
        </a>

        {/* Enlaces */}
        <div className="flex items-center gap-6 text-sm">
          <a href="/" className="hover:text-brand-400">Eventos</a>
          <a href="/mis-boletas" className="hover:text-brand-400">Mis boletas</a>
          <button className="bg-brand-500 hover:bg-brand-400 px-4 py-2 rounded-lg font-semibold">
            Iniciar sesión
          </button>
        </div>
      </div>
    </nav>
  );
}