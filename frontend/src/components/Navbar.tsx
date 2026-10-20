import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { obtenerMiPerfil } from "../services/api";
import type { Usuario } from "../types";

export default function Navbar() {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout, getAccessTokenSilently } =
    useAuth0();
  const [perfil, setPerfil] = useState<Usuario | null>(null);

  // Al iniciar sesión: el backend registra al usuario (si es nuevo) y devuelve su rol
  useEffect(() => {
    if (!isAuthenticated) return;
    getAccessTokenSilently()
      .then((token) => {
        if (!token) throw new Error("No se obtuvo el token de Auth0");
        return obtenerMiPerfil(token);
      })
      .then(setPerfil)
      .catch((e) => console.error("No se pudo cargar el perfil:", e));
  }, [isAuthenticated, getAccessTokenSilently]);

  return (
    <nav className="bg-navy-950 border-b border-navy-700">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-extrabold tracking-tight">
          Mr.<span className="text-brand-400">Boleta</span>
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link to="/" className="hover:text-brand-400">Eventos</Link>
          <Link to="/mis-boletas" className="hover:text-brand-400">Mis boletas</Link>

          {isLoading ? (
            <span className="text-gray-400">...</span>
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="hidden md:inline">{user?.name}</span>
              {perfil?.rol === "ADMIN" && (
                <span className="text-xs bg-brand-500 px-2 py-0.5 rounded">Admin</span>
              )}
              <button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="border border-navy-700 hover:border-brand-400 px-4 py-2 rounded-lg"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <button
              onClick={() => loginWithRedirect()}
              className="bg-brand-500 hover:bg-brand-400 px-4 py-2 rounded-lg font-semibold"
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}