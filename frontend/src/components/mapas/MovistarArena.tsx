import type { Localidad } from "../../types";
import { zonaPreset } from "./presets";
import { formatoCOP } from "../../utils/formato";

// ─── Dimensiones del canvas ─────────────────────────────────────────────────
const CX = 490;   // centro X del SVG
const CY = 390;   // centro Y del SVG (desplazado hacia abajo para dejar espacio al escenario arriba)

// ─── Anillos (elipses concéntricas) ─────────────────────────────────────────
interface Anillo { rxO: number; ryO: number; rxI: number; ryI: number; }

// Piso 3: anillo exterior
const ANILLO_3: Anillo = { rxO: 370, ryO: 248, rxI: 318, ryI: 200 };
// Piso 2: anillo intermedio
const ANILLO_2: Anillo = { rxO: 312, ryO: 194, rxI: 248, ryI: 142 };
// Platea (anillo interior – base de las cajas 101-106)
// Solo se usa como referencia de radio para la pasillo interior
const RADIO_PASILLO_O = 243;
const RADIO_PASILLO_I = 178;

// ─── Números de sección ─────────────────────────────────────────────────────
// Piso 3: 303 → 317 (15 secciones), distribuidas de ~-50° a ~220° (excluyendo zona del escenario)
const NUMEROS_PISO3 = [
  "303","304","305","306","307","308","309","310",
  "311","312","313","314","315","316","317",
];
// Piso 2: 201 → 218 (18 secciones)
const NUMEROS_PISO2 = Array.from({ length: 18 }, (_, i) => String(201 + i));

// ─── Colores neutros ────────────────────────────────────────────────────────
const FONDO_SECCION = "#1e1e26";
const BORDE_SECCION = "#2e2e38";

// ─── Props ──────────────────────────────────────────────────────────────────
interface Props {
  zonas: Localidad[];
  seleccionada: number | null;
  onSeleccionar: (idLocalidad: number) => void;
  className?: string;
}

// ─── Helpers de geometría ────────────────────────────────────────────────────
const grados = (valor: number) => (valor * Math.PI) / 180;

function punto(rx: number, ry: number, angulo: number) {
  return `${(CX + rx * Math.cos(angulo)).toFixed(1)} ${(CY + ry * Math.sin(angulo)).toFixed(1)}`;
}

function sectorPath(a0: number, a1: number, { rxO, ryO, rxI, ryI }: Anillo) {
  const grande = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${punto(rxO, ryO, a0)}`,
    `A ${rxO} ${ryO} 0 ${grande} 1 ${punto(rxO, ryO, a1)}`,
    `L ${punto(rxI, ryI, a1)}`,
    `A ${rxI} ${ryI} 0 ${grande} 0 ${punto(rxI, ryI, a0)}`,
    "Z",
  ].join(" ");
}

/** Reparte un arco en N secciones iguales con un pequeño hueco entre ellas. */
function arco(
  anillo: Anillo,
  cantidad: number,
  inicioGrados: number,
  totalGrados: number,
  huecoDeg = 1.2,
) {
  const paso = totalGrados / cantidad;
  return Array.from({ length: cantidad }, (_, i) => {
    const a0 = grados(inicioGrados + i * paso + huecoDeg / 2);
    const a1 = grados(inicioGrados + (i + 1) * paso - huecoDeg / 2);
    const medio = (a0 + a1) / 2;
    const rx = (anillo.rxO + anillo.rxI) / 2;
    const ry = (anillo.ryO + anillo.ryI) / 2;
    return { d: sectorPath(a0, a1, anillo), x: CX + rx * Math.cos(medio), y: CY + ry * Math.sin(medio) };
  });
}

/** Crea el map sección → localidad a partir de las zonas del evento. */
function ocupacion(zonas: Localidad[]) {
  const porSeccion = new Map<string, { localidad: Localidad; color: string; agotada: boolean }>();
  for (const localidad of zonas) {
    const zona = zonaPreset("movistar-arena", localidad.zona);
    if (!zona) continue;
    for (const seccion of zona.secciones) {
      porSeccion.set(seccion, {
        localidad,
        color: zona.color,
        agotada: localidad.cuposDisponibles === 0,
      });
    }
  }
  return porSeccion;
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function MovistarArena({ zonas, seleccionada, onSeleccionar, className }: Props) {
  const mapa = ocupacion(zonas);

  /**
   * Distribución angular basada en la imagen real del Movistar Arena:
   *
   *  - El ESCENARIO está arriba, en la zona 12 en punto (−90°).
   *  - La TRIBUNA FAN ocupa un arco justo detrás del escenario (arriba, parte gris).
   *  - El PISO 3 va de ~−50° a ~230° (280° en total, dejando ~80° para el escenario/TFAN).
   *  - El PISO 2 idem pero un poco más amplio (~−55° a ~235°).
   *  - La PLATEA (101-106) son cajas rectangulares en el centro.
   *  - FOH es la consola de sonido en el piso central.
   *
   *  Ángulos en SVG: 0° = derecha, 90° = abajo, 180° = izquierda, 270°/−90° = arriba.
   *
   *  La abertura para el escenario está entre −135° y −45° (arriba).
   *  → PISO 3 va de −45° a 215° (260° de arco).
   *  → PISO 2 va de −50° a 220° (270° de arco).
   */
  const grises   = arco(ANILLO_3, 3, -134, 76, 2.5);       // zona gris decorativa arriba (donde va la TFAN)
  const piso3    = arco(ANILLO_3, 15, -45, 260, 1.4);       // 303→317 de −45° a 215°
  const piso2    = arco(ANILLO_2, 18, -50, 270, 1.2);       // 201→218 de −50° a 220°

  // ── Render de una sección del anillo ──────────────────────────────────────
  const seccion = (codigo: string, datos: { d: string; x: number; y: number }, tamano = 12) => {
    const ocupada = mapa.get(codigo);
    const activa  = Boolean(ocupada && seleccionada === ocupada.localidad.id);
    const color   = ocupada?.agotada ? "#4b5563" : (ocupada?.color ?? FONDO_SECCION);

    const contenido = (
      <>
        <path
          d={datos.d}
          fill={color}
          fillOpacity={ocupada ? 0.92 : 1}
          stroke={activa ? "#ffffff" : (ocupada ? color : BORDE_SECCION)}
          strokeWidth={activa ? 2.6 : 1}
        />
        {activa && (
          <path d={datos.d} fill="#ffffff" fillOpacity={0.2} stroke="#ffffff" strokeWidth={2.4} pointerEvents="none" />
        )}
        <text
          x={datos.x} y={datos.y + tamano / 3}
          textAnchor="middle" fontSize={tamano} fontWeight="700"
          fill={ocupada ? "#ffffff" : "#5a5a66"}
          pointerEvents="none"
        >
          {codigo}
        </text>
      </>
    );

    if (!ocupada) return <g key={codigo} aria-hidden pointerEvents="none">{contenido}</g>;

    return (
      <g
        key={codigo}
        role="button"
        tabIndex={ocupada.agotada ? -1 : 0}
        aria-label={`${ocupada.localidad.nombre}, ${formatoCOP(ocupada.localidad.precio)}${
          ocupada.agotada ? ", agotada" : `, ${ocupada.localidad.cuposDisponibles} cupos disponibles`
        }`}
        aria-pressed={activa}
        onClick={() => !ocupada.agotada && onSeleccionar(ocupada.localidad.id)}
        onKeyDown={(e) => {
          if (ocupada.agotada) return;
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSeleccionar(ocupada.localidad.id); }
        }}
        className={`transition-opacity ${ocupada.agotada ? "cursor-not-allowed" : "cursor-pointer hover:opacity-80"}`}
      >
        <title>{`${ocupada.localidad.nombre} · ${formatoCOP(ocupada.localidad.precio)}${
          ocupada.agotada ? " · Agotada" : ` · ${ocupada.localidad.cuposDisponibles} disponibles`
        }`}</title>
        {contenido}
      </g>
    );
  };

  // ── Render de una caja de Platea (101-106) ────────────────────────────────
  const caja = (codigo: string, x: number, y: number, ancho: number, alto: number, tamano = 15) => {
    const ocupada   = mapa.get(codigo);
    const activa    = Boolean(ocupada && seleccionada === ocupada.localidad.id);
    const color     = ocupada?.agotada ? "#4b5563" : (ocupada?.color ?? FONDO_SECCION);
    const centroX   = x + ancho / 2;
    const centroY   = y + alto  / 2;

    const contenido = (
      <>
        <rect x={x} y={y} width={ancho} height={alto} rx={3}
          fill={color} fillOpacity={ocupada ? 0.95 : 1}
          stroke={activa ? "#ffffff" : (ocupada ? color : BORDE_SECCION)}
          strokeWidth={activa ? 2.6 : 1}
        />
        {activa && (
          <rect x={x} y={y} width={ancho} height={alto} rx={3}
            fill="#ffffff" fillOpacity={0.2} stroke="#ffffff" strokeWidth={2.4} pointerEvents="none"
          />
        )}
        <text x={centroX} y={centroY + tamano / 3}
          textAnchor="middle" fontSize={tamano} fontWeight="700"
          fill={ocupada ? "#ffffff" : "#5a5a66"}
          pointerEvents="none"
        >
          {codigo}
        </text>
      </>
    );

    if (!ocupada) return <g key={codigo} aria-hidden pointerEvents="none">{contenido}</g>;

    return (
      <g
        key={codigo}
        role="button"
        tabIndex={ocupada.agotada ? -1 : 0}
        aria-label={`${ocupada.localidad.nombre}, ${formatoCOP(ocupada.localidad.precio)}${
          ocupada.agotada ? ", agotada" : `, ${ocupada.localidad.cuposDisponibles} cupos disponibles`
        }`}
        aria-pressed={activa}
        onClick={() => !ocupada.agotada && onSeleccionar(ocupada.localidad.id)}
        onKeyDown={(e) => {
          if (ocupada.agotada) return;
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSeleccionar(ocupada.localidad.id); }
        }}
        className={`transition-opacity ${ocupada.agotada ? "cursor-not-allowed" : "cursor-pointer hover:opacity-80"}`}
      >
        <title>{`${ocupada.localidad.nombre} · ${formatoCOP(ocupada.localidad.precio)}${
          ocupada.agotada ? " · Agotada" : ` · ${ocupada.localidad.cuposDisponibles} disponibles`
        }`}</title>
        {contenido}
      </g>
    );
  };

  // ── Tribuna Fan ───────────────────────────────────────────────────────────
  // Está en la parte SUPERIOR del arena, detrás del escenario (zona gris).
  // En la imagen se ve como un arco curvo morado justo arriba de las secciones del piso 2.
  // Lo representamos como un sector del anillo exterior del piso 2 en la zona superior.
  const anguloTfanIni = grados(-130);
  const anguloTfanFin = grados(-50);
  const dTribuna = sectorPath(anguloTfanIni, anguloTfanFin, {
    rxO: ANILLO_2.rxO, ryO: ANILLO_2.ryO,
    rxI: ANILLO_2.rxI, ryI: ANILLO_2.ryI,
  });
  const tribuna      = mapa.get("TFAN");
  const tribunaActiva = Boolean(tribuna && seleccionada === tribuna.localidad.id);
  const colorTribuna = tribuna?.agotada ? "#4b5563" : (tribuna?.color ?? FONDO_SECCION);

  // Centro del arco de TFAN para el label
  const anguloMedioTfan = (anguloTfanIni + anguloTfanFin) / 2;
  const rxMedioTfan = (ANILLO_2.rxO + ANILLO_2.rxI) / 2;
  const ryMedioTfan = (ANILLO_2.ryO + ANILLO_2.ryI) / 2;
  const txTfan = CX + rxMedioTfan * Math.cos(anguloMedioTfan);
  const tyTfan = CY + ryMedioTfan * Math.sin(anguloMedioTfan);

  return (
    <svg
      viewBox="0 0 980 720"
      role="img"
      aria-label="Plano del Movistar Arena: platea, piso 2 y piso 3"
      className={className ?? "w-full h-auto select-none"}
    >
      <defs>
        <radialGradient id="fondo-movistar-bg" cx="50%" cy="45%" r="70%">
          <stop offset="0%"   stopColor="#18080e" />
          <stop offset="60%"  stopColor="#0d0d14" />
          <stop offset="100%" stopColor="#07070b" />
        </radialGradient>
      </defs>

      {/* Fondo */}
      <rect width="980" height="720" rx="20" fill="url(#fondo-movistar-bg)" />

      {/* ── Zonas grises decorativas del extremo superior (donde no hay secciones) ── */}
      {grises.map((s, i) => (
        <path
          key={`gris-${i}`}
          d={s.d}
          fill={i % 2 === 0 ? "#d0d0d8" : "#3c3c48"}
          stroke="#08080c"
          strokeWidth="2"
        />
      ))}

      {/* ── Tribuna Fan (arco superior, detrás del escenario) ── */}
      <g
        role={tribuna ? "button" : undefined}
        tabIndex={tribuna && !tribuna.agotada ? 0 : -1}
        aria-label={tribuna ? `${tribuna.localidad.nombre}, ${formatoCOP(tribuna.localidad.precio)}` : undefined}
        aria-pressed={tribunaActiva}
        onClick={() => tribuna && !tribuna.agotada && onSeleccionar(tribuna.localidad.id)}
        onKeyDown={(e) => {
          if (!tribuna || tribuna.agotada) return;
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSeleccionar(tribuna.localidad.id); }
        }}
        className={tribuna
          ? `transition-opacity ${tribuna.agotada ? "cursor-not-allowed" : "cursor-pointer hover:opacity-80"}`
          : undefined}
      >
        {tribuna && <title>{`${tribuna.localidad.nombre} · ${formatoCOP(tribuna.localidad.precio)}`}</title>}
        <path
          d={dTribuna}
          fill={colorTribuna}
          fillOpacity={tribuna ? 0.92 : 1}
          stroke={tribunaActiva ? "#ffffff" : (tribuna ? colorTribuna : BORDE_SECCION)}
          strokeWidth={tribunaActiva ? 2.6 : 1}
        />
        {tribunaActiva && (
          <path d={dTribuna} fill="#ffffff" fillOpacity={0.2} stroke="#ffffff" strokeWidth={2.4} pointerEvents="none" />
        )}
        <text
          x={txTfan} y={tyTfan + 4}
          textAnchor="middle" fontSize={11} fontWeight="700"
          fill={tribuna ? "#ffffff" : "#5a5a66"}
          pointerEvents="none"
        >
          TFAN
        </text>
      </g>

      {/* ── Piso 3: secciones 303 → 317 ── */}
      {piso3.map((s, i) => seccion(NUMEROS_PISO3[i], s, 11))}

      {/* ── Piso 2: secciones 201 → 218 ── */}
      {piso2.map((s, i) => seccion(NUMEROS_PISO2[i], s, 10))}

      {/* ── Pasillo interior (aro blanco que separa piso 2 de la platea) ── */}
      <path
        d={sectorPath(grados(-48), grados(218), {
          rxO: RADIO_PASILLO_O, ryO: RADIO_PASILLO_O * 0.62,
          rxI: RADIO_PASILLO_I, ryI: RADIO_PASILLO_I * 0.62,
        })}
        fill="#ceced6"
        stroke="#08080c"
        strokeWidth="2"
      />
      {/* Divisores del pasillo */}
      {[50, 90, 130].map((ang) => (
        <line
          key={ang}
          x1={CX + RADIO_PASILLO_I * Math.cos(grados(ang))}
          y1={CY + RADIO_PASILLO_I * 0.62 * Math.sin(grados(ang))}
          x2={CX + RADIO_PASILLO_O * Math.cos(grados(ang))}
          y2={CY + RADIO_PASILLO_O * 0.62 * Math.sin(grados(ang))}
          stroke="#08080c"
          strokeWidth="8"
        />
      ))}

      {/* ── Platea: 101, 102, 103 (fila superior) ── */}
      {caja("101", 408, 234, 50, 62)}
      {caja("102", 464, 230, 56, 62)}
      {caja("103", 526, 234, 50, 62)}

      {/* ── Platea: 104, 105, 106 (fila inferior) ── */}
      {caja("104", 410, 302, 50, 50, 12)}
      {caja("105", 466, 302, 52, 50, 12)}
      {caja("106", 524, 302, 50, 50, 12)}

      {/* ── FOH (consola de sonido) ── */}
      <g pointerEvents="none">
        <rect x={454} y={360} width={62} height={30} rx={3} fill="#252530" stroke="#3e3e4a" />
        <text x={485} y={380} textAnchor="middle" fontSize={10} fontWeight="700" fill="#8a8a98">FOH</text>
      </g>

      {/* ── Escenario ── */}
      <g pointerEvents="none">
        <rect x={372} y={96} width={232} height={112} rx={10} fill="#1a1a22" stroke="#36363f" strokeWidth="2" />
        <text
          x={488} y={162}
          textAnchor="middle" fontSize={22} fontWeight="800" letterSpacing="5" fill="#dddde6"
        >
          ESCENARIO
        </text>
      </g>
    </svg>
  );
}
