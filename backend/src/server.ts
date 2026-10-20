import "dotenv/config";
import app from "./app";
import { liberarOrdenesExpiradas } from "./services/ordenes.service";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🎟️  Mr.Boleta API corriendo en http://localhost:${PORT}`);
});

// Cada minuto: las órdenes sin pagar después de 10 minutos expiran y liberan sus cupos
setInterval(() => {
  liberarOrdenesExpiradas()
    .then((n) => {
      if (n > 0) console.log(`⏱️  ${n} orden(es) expirada(s), cupos liberados`);
    })
    .catch((e) => console.error("Error liberando órdenes expiradas:", e));
}, 60 * 1000);