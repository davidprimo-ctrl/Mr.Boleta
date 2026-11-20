import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import {
  actualizarEventoAdmin,
  actualizarLocalidadAdmin,
  agregarLocalidadAdmin,
  cambiarEstadoEvento,
  crearEventoAdmin,
  listarEventosAdmin,
  obtenerMiPerfil,
  obtenerResumenAdmin,
} from "../services/api";
import type { DatosEvento, DatosLocalidad, Evento, MapaId, ResumenAdmin, Usuario } from "../types";
import { formatoCOP, formatoFecha } from "../utils/formato";
import MapaLocalidades from "../components/MapaLocalidades";
import { localidadesSugeridas, localidadesDeVistaPrevia, MAPAS, type MapaPreset } from "../components/mapas/presets";

// El lector QR (ZXing) es pesado: se descarga solo al abrir la pestaña.
const ValidadorQR = lazy(() => import("./ValidadorQR"));

type Estado = Evento["estado"];

const ESTADOS: Record<Estado, { texto: string; clase: string }> = {
  BORRADOR: { texto: "Borrador", clase: "bg-yellow-500/20 text-yellow-300" },
  PUBLICADO: { texto: "Publicado", clase: "bg-green-500/20 text-green-300" },
  INACTIVO: { texto: "Inactivo", clase: "bg-gray-500/20 text-gray-300" },
};

const EVENTO_VACIO: DatosEvento = {
  nombre: "",
  descripcion: "",
  artista: "",
  lugar: "",
  ciudad: "",
  fecha: "",
  imagenUrl: "",
  mapa: "generico",
};
const LOCALIDAD_VACIA: DatosLocalidad = { nombre: "", precio: 0, aforo: 0 };

const aInputFecha = (iso: string) => {
  const d = new Date(iso);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
};
const aISO = (valor: string) => new Date(valor).toISOString();

function Tarjeta({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
      <p className="text-sm text-gray-400">{titulo}</p>
      <p className="text-2xl md:text-3xl font-extrabold mt-1">{valor}</p>
      {nota && <p className="text-xs text-gray-500 mt-1">{nota}</p>}
    </div>
  );
}

export default function Admin() {
  const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [resumen, setResumen] = useState<ResumenAdmin | null>(null);
  const [pestaña, setPestaña] = useState<"resumen" | "eventos" | "crear" | "validar">("resumen");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Formulario de creación
  const [nuevo, setNuevo] = useState<DatosEvento>(EVENTO_VACIO);
  const [nuevasLocalidades, setNuevasLocalidades] = useState<DatosLocalidad[]>([{ ...LOCALIDAD_VACIA }]);

  // Formularios inline de edición
  const [editandoEvento, setEditandoEvento] = useState<number | null>(null);
  const [formEvento, setFormEvento] = useState<DatosEvento>(EVENTO_VACIO);
  const [editandoLocalidad, setEditandoLocalidad] = useState<number | null>(null);
  const [formLocalidad, setFormLocalidad] = useState<DatosLocalidad>(LOCALIDAD_VACIA);
  const [agregandoA, setAgregandoA] = useState<number | null>(null);
  const [nuevaLocalidad, setNuevaLocalidad] = useState<DatosLocalidad>(LOCALIDAD_VACIA);

  const tokenDeSesion = useCallback(async () => {
    const token = await getAccessTokenSilently();
    if (!token) throw new Error("No se obtuvo el token de Auth0");
    return token;
  }, [getAccessTokenSilently]);

  const recargar = useCallback(async () => {
    const token = await tokenDeSesion();
    const [lista, reporte] = await Promise.all([listarEventosAdmin(token), obtenerResumenAdmin(token)]);
    setEventos(lista);
    setResumen(reporte);
  }, [tokenDeSesion]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    tokenDeSesion()
      .then((token) => obtenerMiPerfil(token))
      .then((perfil) => {
        setPerfil(perfil);
        if (perfil.rol !== "ADMIN") throw new Error("Tu usuario no tiene rol de administrador");
        return recargar();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, [isLoading, isAuthenticated, tokenDeSesion, recargar]);

  async function ejecutar(accion: (token: string) => Promise<unknown>, mensaje: string) {
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      await accion(await tokenDeSesion());
      setAviso(mensaje);
      await recargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  if (!isLoading && !isAuthenticated) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold mb-4">Panel de administrador</h1>
        <p className="text-gray-300 mb-6">Inicia sesión con una cuenta de administrador para entrar.</p>
        <button
          type="button"
          onClick={() => loginWithRedirect({ appState: { returnTo: "/admin" } })}
          className="bg-brand-500 hover:bg-brand-400 px-6 py-3 rounded-lg font-semibold"
        >
          Iniciar sesión
        </button>
      </main>
    );
  }

  if (cargando) {
    return <p className="max-w-6xl mx-auto px-4 py-12 text-gray-400">Cargando panel...</p>;
  }

  if (error && perfil?.rol !== "ADMIN") {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold mb-4">Panel de administrador</h1>
        <p className="text-red-400">{error}</p>
        <Link to="/" className="text-brand-400 hover:underline">← Volver al catálogo</Link>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand-400 uppercase text-xs font-semibold">Mr.Boleta · Administración</p>
          <h1 className="text-3xl md:text-4xl font-extrabold">Panel de administrador</h1>
          <p className="text-gray-400 text-sm mt-1">{perfil?.email}</p>
        </div>
        <Link to="/" className="text-brand-400 hover:underline text-sm">Ver catálogo →</Link>
      </div>

      {error && <p className="mt-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-300">{error}</p>}
      {aviso && <p className="mt-6 bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-300">{aviso}</p>}

      <div className="flex gap-2 mt-8 border-b border-navy-700">
        {([
          ["resumen", "Resumen de ventas"],
          ["eventos", "Eventos y localidades"],
          ["crear", "Crear evento"],
          ["validar", "Validar boletas (QR)"],
        ] as const).map(([clave, texto]) => (
          <button
            key={clave}
            type="button"
            onClick={() => setPestaña(clave)}
            className={`px-4 py-3 font-semibold border-b-2 -mb-px ${
              pestaña === clave ? "border-brand-400 text-brand-400" : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {/* ── HU09: reporte ── */}
      {pestaña === "resumen" && (
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-4">Ventas, ingresos y cupos</h2>
          {resumen && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Tarjeta titulo="Ventas aprobadas" valor={String(resumen.totalVentas)} nota="Órdenes pagadas" />
                <Tarjeta titulo="Ingresos" valor={formatoCOP(resumen.ingresos)} nota="Solo pagos aprobados" />
                <Tarjeta titulo="Boletas vendidas" valor={String(resumen.boletasVendidas)} />
                <Tarjeta
                  titulo="Cupos disponibles"
                  valor={String(resumen.cuposDisponibles)}
                  nota={`de ${resumen.aforoTotal} totales`}
                />
              </div>

              {resumen.eventos.length === 0 ? (
                <p className="text-gray-400 mt-8">Todavía no hay eventos creados.</p>
              ) : (
                <div className="mt-8 overflow-x-auto bg-navy-800 border border-navy-700 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="text-gray-400 border-b border-navy-700">
                      <tr>
                        <th className="text-left p-4">Evento</th>
                        <th className="text-right p-4">Ventas</th>
                        <th className="text-right p-4">Ingresos</th>
                        <th className="text-right p-4">Boletas</th>
                        <th className="text-right p-4">Cupos restantes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-700">
                      {resumen.eventos.map((e) => (
                        <tr key={e.id}>
                          <td className="p-4">
                            <p className="font-semibold">{e.nombre}</p>
                            <p className="text-xs text-gray-500 first-letter:uppercase">{formatoFecha(e.fecha)}</p>
                          </td>
                          <td className="p-4 text-right">{e.ventas}</td>
                          <td className="p-4 text-right">{formatoCOP(e.ingresos)}</td>
                          <td className="p-4 text-right">{e.boletasVendidas}</td>
                          <td className="p-4 text-right">
                            {e.cuposDisponibles} / {e.aforoTotal}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Eventos y localidades ── */}
      {pestaña === "eventos" && (
        <section className="mt-8 space-y-6">
          {eventos.length === 0 && <p className="text-gray-400">Todavía no hay eventos creados.</p>}
          {eventos.map((evento) => (
            <article key={evento.id} className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {evento.nombre} <span className="text-gray-500 text-sm">#{evento.id}</span>
                  </h2>
                  <p className="text-gray-400 text-sm first-letter:uppercase">{formatoFecha(evento.fecha)}</p>
                  <p className="text-gray-500 text-sm">
                    {evento.lugar} · {evento.ciudad} · {evento.artista}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ESTADOS[evento.estado].clase}`}>
                  {ESTADOS[evento.estado].texto}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {(["BORRADOR", "PUBLICADO", "INACTIVO"] as Estado[])
                  .filter((e) => e !== evento.estado)
                  .map((estado) => (
                    <button
                      key={estado}
                      type="button"
                      disabled={guardando}
                      onClick={() =>
                        ejecutar(
                          (token) => cambiarEstadoEvento(token, evento.id, estado),
                          `Evento ${estado === "PUBLICADO" ? "publicado" : estado === "INACTIVO" ? "desactivado" : "en borrador"}.`,
                        )
                      }
                      className="text-xs border border-navy-700 hover:border-brand-400 px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      Pasar a {ESTADOS[estado].texto.toLowerCase()}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => {
                    setEditandoEvento(editandoEvento === evento.id ? null : evento.id);
                    setFormEvento({
                      nombre: evento.nombre,
                      descripcion: evento.descripcion,
                      artista: evento.artista,
                      lugar: evento.lugar,
                      ciudad: evento.ciudad,
                      fecha: aInputFecha(evento.fecha),
                      imagenUrl: evento.imagenUrl ?? "",
                    });
                  }}
                  className="text-xs border border-navy-700 hover:border-brand-400 px-3 py-1.5 rounded-lg"
                >
                  {editandoEvento === evento.id ? "Cancelar edición" : "Editar datos"}
                </button>
              </div>

              {editandoEvento === evento.id && (
                <form
                  className="grid gap-3 sm:grid-cols-2 mt-4 bg-navy-900 rounded-lg p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void ejecutar(
                      (token) =>
                        actualizarEventoAdmin(token, evento.id, {
                          ...formEvento,
                          fecha: aISO(formEvento.fecha),
                          imagenUrl: formEvento.imagenUrl || null,
                        }),
                      "Datos del evento actualizados.",
                    ).then(() => setEditandoEvento(null));
                  }}
                >
                  {(
                    ["nombre", "artista", "lugar", "ciudad", "descripcion", "imagenUrl"] as const
                  ).map((campo) => (
                    <label key={campo} className="text-sm">
                      {campo === "imagenUrl" ? "URL de imagen" : campo[0].toUpperCase() + campo.slice(1)}
                      <input
                        value={formEvento[campo] ?? ""}
                        onChange={(e) => setFormEvento({ ...formEvento, [campo]: e.target.value })}
                        className="mt-1 w-full bg-navy-800 border border-navy-700 rounded-lg p-2"
                      />
                    </label>
                  ))}
                  <label className="text-sm">
                    Fecha y hora
                    <input
                      type="datetime-local"
                      value={formEvento.fecha}
                      onChange={(e) => setFormEvento({ ...formEvento, fecha: e.target.value })}
                      className="mt-1 w-full bg-navy-800 border border-navy-700 rounded-lg p-2"
                      required
                    />
                  </label>
                  <button type="submit" disabled={guardando} className="sm:col-span-2 bg-brand-500 rounded-lg py-2 font-semibold disabled:opacity-50">
                    Guardar cambios
                  </button>
                </form>
              )}

              <h3 className="font-bold mt-6 mb-2">Localidades</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-400 border-b border-navy-700">
                    <tr>
                      <th className="text-left p-2">Nombre</th>
                      <th className="text-right p-2">Precio</th>
                      <th className="text-right p-2">Aforo</th>
                      <th className="text-right p-2">Cupos</th>
                      <th className="text-right p-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-700">
                    {evento.localidades.map((loc) => (
                      <tr key={loc.id}>
                        {editandoLocalidad === loc.id ? (
                          <>
                            <td className="p-2" colSpan={4}>
                              <form
                                className="flex flex-wrap gap-2"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  void ejecutar(
                                    (token) => actualizarLocalidadAdmin(token, loc.id, formLocalidad),
                                    "Localidad actualizada.",
                                  ).then(() => setEditandoLocalidad(null));
                                }}
                              >
                                <input
                                  aria-label="Nombre de la localidad"
                                  value={formLocalidad.nombre}
                                  onChange={(e) => setFormLocalidad({ ...formLocalidad, nombre: e.target.value })}
                                  className="bg-navy-900 border border-navy-700 rounded p-2"
                                />
                                <input
                                  aria-label="Precio"
                                  type="number"
                                  min={1}
                                  value={formLocalidad.precio}
                                  onChange={(e) => setFormLocalidad({ ...formLocalidad, precio: Number(e.target.value) })}
                                  className="w-32 bg-navy-900 border border-navy-700 rounded p-2"
                                />
                                <input
                                  aria-label="Aforo"
                                  type="number"
                                  min={1}
                                  value={formLocalidad.aforo}
                                  onChange={(e) => setFormLocalidad({ ...formLocalidad, aforo: Number(e.target.value) })}
                                  className="w-24 bg-navy-900 border border-navy-700 rounded p-2"
                                />
                                <button type="submit" disabled={guardando} className="bg-brand-500 rounded px-4 text-sm">Guardar</button>
                                <button type="button" onClick={() => setEditandoLocalidad(null)} className="text-gray-400 text-sm">Cancelar</button>
                              </form>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 font-semibold">{loc.nombre}</td>
                            <td className="p-2 text-right">{formatoCOP(loc.precio)}</td>
                            <td className="p-2 text-right">{loc.aforo}</td>
                            <td className="p-2 text-right">{loc.cuposDisponibles}</td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditandoLocalidad(loc.id);
                                  setFormLocalidad({ nombre: loc.nombre, precio: Number(loc.precio), aforo: loc.aforo });
                                }}
                                className="text-brand-400 hover:underline text-xs"
                              >
                                Editar
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {agregandoA === evento.id ? (
                <form
                  className="flex flex-wrap gap-2 mt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void ejecutar(
                      (token) => agregarLocalidadAdmin(token, evento.id, nuevaLocalidad),
                      "Localidad agregada.",
                    ).then(() => setAgregandoA(null));
                  }}
                >
                  <input
                    aria-label="Nombre de la nueva localidad"
                    placeholder="Nombre"
                    value={nuevaLocalidad.nombre}
                    onChange={(e) => setNuevaLocalidad({ ...nuevaLocalidad, nombre: e.target.value })}
                    className="bg-navy-900 border border-navy-700 rounded p-2"
                    required
                  />
                  <input
                    aria-label="Precio de la nueva localidad"
                    type="number"
                    min={1}
                    placeholder="Precio"
                    value={nuevaLocalidad.precio || ""}
                    onChange={(e) => setNuevaLocalidad({ ...nuevaLocalidad, precio: Number(e.target.value) })}
                    className="w-32 bg-navy-900 border border-navy-700 rounded p-2"
                    required
                  />
                  <input
                    aria-label="Aforo de la nueva localidad"
                    type="number"
                    min={1}
                    placeholder="Aforo"
                    value={nuevaLocalidad.aforo || ""}
                    onChange={(e) => setNuevaLocalidad({ ...nuevaLocalidad, aforo: Number(e.target.value) })}
                    className="w-24 bg-navy-900 border border-navy-700 rounded p-2"
                    required
                  />
                  <button type="submit" disabled={guardando} className="bg-brand-500 rounded px-4 text-sm">Agregar</button>
                  <button type="button" onClick={() => setAgregandoA(null)} className="text-gray-400 text-sm">Cancelar</button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAgregandoA(evento.id);
                    setNuevaLocalidad({ ...LOCALIDAD_VACIA });
                  }}
                  className="text-brand-400 hover:underline text-sm mt-4"
                >
                  + Agregar localidad
                </button>
              )}
            </article>
          ))}
        </section>
      )}

      {/* ── Check-in de boletas con cámara ── */}
      {pestaña === "validar" && (
        <Suspense fallback={<p className="mt-8 text-gray-400">Cargando lector QR...</p>}>
          <ValidadorQR tokenDeSesion={tokenDeSesion} />
        </Suspense>
      )}

      {/* ── Crear evento ── */}
      {pestaña === "crear" && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
          {/* ── Formulario ── */}
          <form
            className="bg-navy-800 border border-navy-700 rounded-xl p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void ejecutar(
                (token) =>
                  crearEventoAdmin(token, {
                    ...nuevo,
                    fecha: aISO(nuevo.fecha),
                    imagenUrl: nuevo.imagenUrl || null,
                    localidades: nuevasLocalidades,
                  }),
                "Evento creado en BORRADOR. Publícalo desde la pestaña Eventos.",
              ).then(() => {
                setNuevo({ ...EVENTO_VACIO });
                setNuevasLocalidades([{ ...LOCALIDAD_VACIA }]);
                setPestaña("eventos");
              });
            }}
          >
            <h2 className="text-xl font-bold">Nuevo evento</h2>
            <p className="text-gray-400 text-sm">Se crea en BORRADOR; no aparece en el catálogo hasta publicarlo.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                ["nombre", "artista", "lugar", "ciudad", "descripcion", "imagenUrl"] as const
              ).map((campo) => (
                <label key={campo} className="text-sm">
                  {campo === "imagenUrl" ? "URL de imagen" : campo[0].toUpperCase() + campo.slice(1)}
                  <input
                    value={nuevo[campo] ?? ""}
                    onChange={(e) => setNuevo({ ...nuevo, [campo]: e.target.value })}
                    className="mt-1 w-full bg-navy-900 border border-navy-700 rounded-lg p-2"
                    required={campo !== "descripcion" && campo !== "imagenUrl"}
                  />
                </label>
              ))}
              <label className="text-sm">
                Fecha y hora
                <input
                  type="datetime-local"
                  value={nuevo.fecha}
                  onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })}
                  className="mt-1 w-full bg-navy-900 border border-navy-700 rounded-lg p-2"
                  required
                />
              </label>

              {/* ── Selector de mapa ── */}
              <label className="text-sm sm:col-span-2">
                Plano del recinto
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(Object.values(MAPAS) as MapaPreset[]).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const mapaId = preset.id as MapaId;
                        setNuevo({ ...nuevo, mapa: mapaId });
                        // Cargar localidades sugeridas del preset (solo si no es genérico)
                        if (mapaId !== "generico") {
                          setNuevasLocalidades(localidadesSugeridas(mapaId));
                        } else {
                          setNuevasLocalidades([{ ...LOCALIDAD_VACIA }]);
                        }
                      }}
                      className={`text-left p-3 rounded-xl border-2 transition-colors ${
                        nuevo.mapa === preset.id
                          ? "border-brand-500 bg-brand-500/10"
                          : "border-navy-700 bg-navy-900 hover:border-navy-600"
                      }`}
                    >
                      <p className="font-semibold text-sm">{preset.nombre}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{preset.descripcion}</p>
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div className="border-t border-navy-700 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">
                  Localidades
                  {nuevo.mapa !== "generico" && (
                    <span className="ml-2 text-xs text-brand-400 font-normal">
                      · cargadas desde el plano ({nuevo.mapa})
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => setNuevasLocalidades([...nuevasLocalidades, { ...LOCALIDAD_VACIA }])}
                  className="text-brand-400 hover:underline text-sm"
                >
                  + Agregar localidad
                </button>
              </div>
              <div className="space-y-2 mt-3">
                {nuevasLocalidades.map((loc, i) => (
                  <div key={i} className="flex flex-wrap gap-2 items-center">
                    <input
                      aria-label={`Nombre de localidad ${i + 1}`}
                      placeholder="Nombre (ej. VIP)"
                      value={loc.nombre}
                      onChange={(e) =>
                        setNuevasLocalidades(nuevasLocalidades.map((l, j) => (j === i ? { ...l, nombre: e.target.value } : l)))
                      }
                      className="bg-navy-900 border border-navy-700 rounded p-2 flex-1 min-w-40"
                      required
                    />
                    <input
                      aria-label={`Precio de localidad ${i + 1}`}
                      type="number"
                      min={1}
                      placeholder="Precio"
                      value={loc.precio || ""}
                      onChange={(e) =>
                        setNuevasLocalidades(nuevasLocalidades.map((l, j) => (j === i ? { ...l, precio: Number(e.target.value) } : l)))
                      }
                      className="w-32 bg-navy-900 border border-navy-700 rounded p-2"
                      required
                    />
                    <input
                      aria-label={`Aforo de localidad ${i + 1}`}
                      type="number"
                      min={1}
                      placeholder="Aforo"
                      value={loc.aforo || ""}
                      onChange={(e) =>
                        setNuevasLocalidades(nuevasLocalidades.map((l, j) => (j === i ? { ...l, aforo: Number(e.target.value) } : l)))
                      }
                      className="w-24 bg-navy-900 border border-navy-700 rounded p-2"
                      required
                    />
                    {loc.zona && (
                      <span className="text-xs text-gray-500 bg-navy-900 border border-navy-700 rounded px-2 py-2">
                        zona: {loc.zona}
                      </span>
                    )}
                    {nuevasLocalidades.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNuevasLocalidades(nuevasLocalidades.filter((_, j) => j !== i))}
                        className="text-red-400 text-sm px-2"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={guardando} className="bg-brand-500 hover:bg-brand-400 rounded-lg px-6 py-3 font-semibold disabled:opacity-50">
              {guardando ? "Creando..." : "Crear evento"}
            </button>
          </form>

          {/* ── Vista previa del mapa ── */}
          <div className="sticky top-6">
            <p className="text-sm text-gray-400 mb-3 font-semibold uppercase tracking-wide">
              Vista previa del plano
            </p>
            <MapaLocalidades
              zonas={localidadesDeVistaPrevia(nuevo.mapa ?? "generico")}
              seleccionada={null}
              onSeleccionar={() => {}}
              mapa={nuevo.mapa ?? "generico"}
            />
          </div>
        </div>
      )}
    </main>
  );
}
