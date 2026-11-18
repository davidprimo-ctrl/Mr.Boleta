import { QRCodeSVG } from "qrcode.react";
import type { Boleta } from "../types";

interface Props {
  boleta: Boleta;
  localidad: string;
  numero: number;
}

/** Una boleta con su código QR, lista para presentar en la entrada. */
export default function TarjetaBoleta({ boleta, localidad, numero }: Props) {
  return (
    <div className="bg-white text-navy-950 rounded-xl p-4 flex flex-col items-center">
      <QRCodeSVG value={boleta.codigoQr} size={140} />
      <p className="font-bold mt-3">
        {localidad} · Boleta {numero}
      </p>
      <p className="text-[10px] text-gray-500 break-all text-center mt-1">{boleta.codigoQr}</p>
    </div>
  );
}