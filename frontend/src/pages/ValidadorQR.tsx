import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { validarBoletaAdmin } from "../services/api";
import type { BoletaValidada } from "../types";
import { formatoCOP, formatoFecha } from "../utils/formato";

type Registro = {
  ok: boolean;
  mensaje: string;
  hora: string;
  boleta?: BoletaValidada;
};

function sonar(ok: boolean) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = ok ? 880 : 220;
    vol.gain.setValueAtTime(0.09, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(vol).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => void ctx.close();
  } catch {
    // Si el celular bloquea el audio, la validación igual funciona.
  }
}

/**
 * Check-in con la cámara del celular. Mantiene el lector abierto para escanear
 * varias boletas seguidas y evita reenviar el mismo QR mientras siga en cuadro.
 */
export default function ValidadorQR({ tokenDeSesion }: { tokenDeSesion: () => Promise<string> }) {
  const [estado, setEstado] = useState<"detenido" | "iniciando" | "activo">("detenido");
  const [errorCamara, setErrorCamara] = useState("");
  const [manual, setManual] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [ultimo, setUltimo] = useState<Registro | null>(null);
  const [historial, setHistorial] = useState<Registro[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const ocupadoRef = useRef(false);
  const ultimoQrRef = useRef({ codigo: "", hora: 0 });

  const registrar = useCallback((registro: Registro) => {
    setUltimo(registro);
    setHistorial((h) => [registro, ...h].slice(0, 20));
    sonar(registro.ok);
  }, []);

  const validar = useCallback(
    async (codigoQr: string) => {
      const codigo = codigoQr.trim();
      if (!codigo || ocupadoRef.current) return;
      const ahora = Date.now();
      // La cámara lee el mismo código en muchos frames: ignore lecturas repetidas en 2 s.
      if (ultimoQrRef.current.codigo === codigo && ahora - ultimoQrRef.current.hora < 2000) return;
      ultimoQrRef.current = { codigo, hora: ahora };

      ocupadoRef.current = true;
      setProcesando(true);
      try {
        const boleta = await validarBoletaAdmin(await tokenDeSesion(), codigo);
        registrar({ ok: true, mensaje: "Boleta validada correctamente", hora: new Date().toLocaleTimeString("es-CO"), boleta });
      } catch (e) {
        registrar({ ok: false, mensaje: (e as Error).message, hora: new Date().toLocaleTimeString("es-CO") });
      } finally {
        ocupadoRef.current = false;
        setProcesando(false);
      }
    },
    [registrar, tokenDeSesion],
  );

  const iniciar = useCallback(async () => {
    setErrorCamara("");
    setEstado("iniciando");
    try {
      const scanner = new Html5Qrcode("lector-qr", {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" }, // cámara trasera del celular
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decoded) => void validar(decoded),
        () => {
          // Se ignora: la cámara llama esto en cada frame sin QR visible.
        },
      );
      setEstado("activo");
    } catch (e) {
      scannerRef.current = null;
      setEstado("detenido");
      setErrorCamara(
        "No se pudo abrir la cámara. En el celular debe usar HTTPS (Vercel lo da), permitir el permiso y usar la cámara trasera.",
      );
      console.error("Error al iniciar el escáner", e);
    }
  }, [validar]);

  const detener = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // Ya estaba detenido.
      }
    }
    setEstado("detenido");
  }, []);

  // Apaga la cámara al salir de la pestaña o cerrar la página.
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) void scanner.stop().then(() => scanner.clear()).catch(() => undefined);
    };
  }, []);

  const aceptadas = historial.filter((r) => r.ok).length;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">Validar boletas (escáner QR)</h2>
      <p className="text-gray-400 text-sm mt-1">
        Apunta la cámara trasera al QR de la boleta. El sistema la marca como <strong>USADA</strong> y avisa si ya fue
        escaneada o si su pago no está aprobado.
      </p>

      {errorCamara && <p className="mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">{errorCamara}</p>}

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <div>
          <div className="relative bg-black rounded-xl overflow-hidden min-h-[280px] border border-navy-700">
            {/* El elemento debe existir siempre para que la librería pueda iniciar la cámara. */}
            <div id="lector-qr" className="w-full" />
            {estado !== "activo" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 pointer-events-none">
                <span className="text-5xl">📷</span>
                <p className="text-gray-300 text-sm">
                  {estado === "iniciando" ? "Encendiendo cámara..." : "La cámara está apagada"}
                </p>
              </div>
            )}
            {procesando && (
              <div className="absolute top-3 right-3 bg-brand-500 text-xs font-semibold px-3 py-1 rounded-full">
                Validando...
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {estado === "activo" ? (
              <button type="button" onClick={() => void detener()} className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg text-sm font-semibold">
                Apagar cámara
              </button>
            ) : (
              <button type="button" onClick={() => void iniciar()} disabled={estado === "iniciando"} className="bg-brand-500 hover:bg-brand-400 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                Activar cámara
              </button>
            )}
            <span className="text-sm text-gray-400 self-center">
              Validadas en esta sesión: <strong className="text-white">{aceptadas}</strong>
            </span>
          </div>

          <form
            className="mt-6 border-t border-navy-700 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void validar(manual).then(() => setManual(""));
            }}
          >
            <label className="text-sm text-gray-300">
              ¿La cámara no funciona? Ingresa el código de la boleta
              <div className="flex gap-2 mt-1">
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="Código QR de la boleta"
                  className="flex-1 bg-navy-900 border border-navy-700 rounded-lg p-2 text-white"
                />
                <button type="submit" disabled={procesando || !manual.trim()} className="bg-navy-700 hover:bg-navy-600 px-4 rounded-lg text-sm font-semibold disabled:opacity-50">
                  Validar
                </button>
              </div>
            </label>
          </form>
        </div>

        <div>
          {ultimo && (
            <div
              className={`rounded-xl border p-5 ${ultimo.ok ? "bg-green-500/10 border-green-500/50" : "bg-red-500/10 border-red-500/50"}`}
            >
              <p className={`text-lg font-bold ${ultimo.ok ? "text-green-300" : "text-red-300"}`}>
                {ultimo.ok ? "✓ " : "✕ "}
                {ultimo.mensaje}
              </p>
              <p className="text-xs text-gray-400 mt-1">{ultimo.hora}</p>
              {ultimo.boleta && (
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Boleta</dt>
                    <dd className="text-right font-mono text-xs break-all">#{ultimo.boleta.id} · {ultimo.boleta.codigoQr}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Evento</dt>
                    <dd className="text-right font-semibold">{ultimo.boleta.evento.nombre}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Fecha</dt>
                    <dd className="text-right first-letter:uppercase">{formatoFecha(ultimo.boleta.evento.fecha)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Localidad</dt>
                    <dd className="text-right">{ultimo.boleta.localidad}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Comprador</dt>
                    <dd className="text-right">{ultimo.boleta.comprador.nombre}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Orden</dt>
                    <dd className="text-right">{ultimo.boleta.orden.id} · {formatoCOP(ultimo.boleta.orden.total)}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}

          <h3 className="font-bold mt-6 mb-2">Historial de esta sesión</h3>
          {historial.length === 0 ? (
            <p className="text-gray-500 text-sm">Aún no se ha escaneado ninguna boleta.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {historial.map((r, i) => (
                <li key={`${r.hora}-${i}`} className={`flex justify-between gap-3 text-sm rounded-lg px-3 py-2 ${r.ok ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                  <span>{r.ok ? "✓" : "✕"} {r.boleta ? `${r.boleta.evento.nombre} · ${r.boleta.localidad}` : r.mensaje}</span>
                  <span className="text-gray-500 text-xs shrink-0">{r.hora}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
