import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { QRCodeSVG } from "qrcode.react";
import { confirmarPagoMercadoPago, iniciarPago, obtenerOrden } from "../services/api";
import type { EstadoOrden, Orden } from "../types";
import { formatoCOP, formatoFecha } from "../utils/formato";

const ESTADOS: Record<EstadoOrden, { texto: string; clase: string }> = {
  PENDIENTE: { texto: "Reservada · pendiente de pago", clase: "bg-yellow-500/20 text-yellow-300" },
  APROBADA: { texto: "Pagada", clase: "bg-green-500/20 text-green-300" },
  RECHAZADA: { texto: "Pago rechazado", clase: "bg-red-500/20 text-red-300" },
  EXPIRADA: { texto: "Reserva vencida", clase: "bg-gray-500/20 text-gray-300" },
};

export default function PaginaOrden() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [orden, setOrden] = useState<Orden | null>(null);
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState("");
  const [confirmandoPago, setConfirmandoPago] = useState(Boolean(paymentId));
  const confirmadoRef = useRef<string | null>(null);

  // Cargar la orden (requiere sesión). Si vuelve de Mercado Pago, confirma el pago primero.
  useEffect(() => {
    if (isLoading || !isAuthenticated || !id) return;
    let activo = true;

    (async () => {
      try {
        const token = await getAccessTokenSilently();
        if (!token) throw new Error("No se obtuvo el token de Auth0");

        if (paymentId && confirmadoRef.current !== paymentId) {
          confirmadoRef.current = paymentId;
          setConfirmandoPago(true);
          try {
            await confirmarPagoMercadoPago(token, paymentId);
          } catch (e) {
            // Si Mercado Pago aún no reporta el pago, igual mostramos la orden.
            console.warn("No se pudo confirmar el pago:", (e as Error).message);
          } finally {
            // Quita payment_id de la URL para que recargar no repita la confirmación.
            window.history.replaceState({}, "", `/ordenes/${id}`);
          }
        }

        const datos = await obtenerOrden(token, id);
        if (activo) setOrden(datos);
      } catch (e) {
        if (activo) setError((e as Error).message);
      } finally {
        if (activo) setConfirmandoPago(false);
      }
    })();

    return () => {
      activo = false;
    };
  }, [id, paymentId, isAuthenticated, isLoading, getAccessTokenSilently]);

  // Reloj: se actualiza cada segundo para el contador
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);

  // Si el pago quedó pendiente, refresca la orden para reflejar el webhook de Mercado Pago.
  useEffect(() => {
    if (!isAuthenticated || !id || orden?.estado !== "PENDIENTE") return;
    const temporizador = setInterval(() => {
      void (async () => {
        try {
          const token = await getAccessTokenSilently();
          if (!token) return;
          setOrden(await obtenerOrden(token, id));
        } catch {
          // Se reintenta en el siguiente intervalo.
        }
      })();
    }, 5000);
    return () => clearInterval(temporizador);
  }, [id, isAuthenticated, orden?.estado, getAccessTokenSilently]);

  if (!isLoading && !isAuthenticated) {
    return <p className="max-w-3xl mx-auto px-4 py-12">Inicia sesión para ver tu orden.</p>;
  }
  if (error) {
    return <p className="max-w-3xl mx-auto px-4 py-12 text-red-400">{error}</p>;
  }
  if (!orden) {
    return <p className="max-w-3xl mx-auto px-4 py-12 text-gray-400">Cargando orden...</p>;
  }

  const restanteMs = Math.max(0, new Date(orden.expiraEn).getTime() - ahora);
  const minutos = Math.floor(restanteMs / 60000);
  const segundos = Math.floor((restanteMs % 60000) / 1000);
  const vencida = orden.estado === "EXPIRADA" || (orden.estado === "PENDIENTE" && restanteMs === 0);
  const estado = ESTADOS[vencida ? "EXPIRADA" : orden.estado];

  async function pagar() {
    if (!orden) return;
    setPagando(true);
    setErrorPago("");
    try {
      const token = await getAccessTokenSilently();
      if (!token) throw new Error("No se obtuvo el token de Auth0");
      const { urlPago } = await iniciarPago(token, orden.id);
      window.location.href = urlPago; // ir a la pasarela
    } catch (e) {
      setErrorPago((e as Error).message);
      setPagando(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-sm text-gray-400">Orden #{orden.id}</p>
      <h1 className="text-3xl font-extrabold">{orden.evento.nombre}</h1>
      <p className="text-gray-300 first-letter:uppercase">
        {formatoFecha(orden.evento.fecha)} · {orden.evento.lugar}, {orden.evento.ciudad}
      </p>

      <span className={`inline-block mt-4 px-3 py-1 rounded-full text-sm font-semibold ${estado.clase}`}>
        {estado.texto}
      </span>

      {confirmandoPago && (
        <p className="mt-4 bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 text-blue-200 text-sm">
          Confirmando tu pago con Mercado Pago...
        </p>
      )}

      {/* Contador de la reserva */}
      {orden.estado === "PENDIENTE" && !vencida && (
        <div className="mt-6 bg-navy-800 border border-yellow-500/50 rounded-xl p-6 text-center">
          <p className="text-gray-300">Tus boletas están reservadas por</p>
          <p className="text-5xl font-extrabold text-yellow-300 tabular-nums mt-2">
            {String(minutos).padStart(2, "0")}:{String(segundos).padStart(2, "0")}
          </p>
          <p className="text-sm text-gray-400 mt-2">Completa el pago antes de que termine el tiempo.</p>
        </div>
      )}

      {(vencida || orden.estado === "RECHAZADA") && (
        <div className="mt-6 bg-navy-800 border border-navy-700 rounded-xl p-6">
          <p>
            {orden.estado === "RECHAZADA"
              ? "El pago fue rechazado y los cupos se liberaron."
              : "La reserva venció y los cupos se liberaron."}
          </p>
          <Link to={`/eventos/${orden.evento.id}`} className="text-brand-400 hover:underline">
            Volver a intentarlo →
          </Link>
        </div>
      )}

      {/* Resumen */}
      <div className="mt-6 bg-navy-800 border border-navy-700 rounded-xl divide-y divide-navy-700">
        {orden.detalles.map((d) => (
          <div key={d.id} className="flex justify-between p-4">
            <span>
              {d.cantidad} × {d.localidad.nombre}{" "}
              <span className="text-gray-400">({formatoCOP(d.precioUnitario)} c/u)</span>
            </span>
            <span className="font-semibold">{formatoCOP(d.subtotal)}</span>
          </div>
        ))}
        <div className="flex justify-between p-4 text-xl font-bold">
          <span>Total</span>
          <span>{formatoCOP(orden.total)}</span>
        </div>
      </div>

      {orden.estado === "PENDIENTE" && !vencida && (
        <>
          <button
            type="button"
            onClick={pagar}
            disabled={pagando}
            className="w-full mt-6 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 py-3 rounded-lg font-semibold"
          >
            {pagando ? "Conectando con la pasarela..." : `Pagar ${formatoCOP(orden.total)}`}
          </button>
          {errorPago && <p className="text-red-400 text-sm mt-3">{errorPago}</p>}
        </>
      )}

      {/* Boletas con QR (solo si el pago fue aprobado) */}
      {orden.estado === "APROBADA" && (
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-4">Tus boletas 🎟️</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {orden.detalles.flatMap((d) =>
              d.boletas.map((boleta, i) => (
                <div key={boleta.id} className="bg-white text-navy-950 rounded-xl p-5 flex flex-col items-center">
                  <QRCodeSVG value={boleta.codigoQr} size={160} />
                  <p className="font-bold mt-3">
                    {d.localidad.nombre} · Boleta {i + 1}
                  </p>
                  <p className="text-[10px] text-gray-500 break-all text-center mt-1">{boleta.codigoQr}</p>
                </div>
              )),
            )}
          </div>
          <p className="text-sm text-gray-400 mt-4">Presenta este código QR en la entrada del evento.</p>
        </section>
      )}
    </main>
  );
}