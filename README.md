# Mr.Boleta

Tiquetera virtual para eventos musicales. Versión actual: **v0.3.5** (Sprint 3).

## Demo en línea

- **Aplicación:** https://mr-boleta.vercel.app
- **API:** https://mr-boleta-api.onrender.com/api/eventos

> El backend usa el plan gratuito de Render: la primera visita puede tardar ~50 segundos mientras el servidor despierta.

## Sprint 3

- **Documentación interactiva de la API:** `/api/docs` (o `http://localhost:3000`, que redirige ahí). El documento OpenAPI está en `/api/docs.json`.
- **Panel de administrador:** `/admin` (solo usuarios con rol `ADMIN`). Permite crear, editar, publicar y desactivar eventos y localidades.
- **Reporte de ventas (HU09):** pestaña "Resumen de ventas" del panel; API en `GET /api/admin/resumen`.
- **Check-in con QR:** pestaña "Validar boletas (QR)" del panel: la cámara del celular escanea cada boleta, la marca como usada y rechaza duplicados; API en `POST /api/admin/boletas/validar`.
- **Mapa del recinto:** cada evento muestra un recinto con secciones de colores por localidad, puntos de asientos, escenario, zoom y panel de precios; se puede elegir la zona en el mapa o en la lista.
- **Pagos con Mercado Pago:** Checkout Pro en COP, con confirmación al volver y webhook idempotente. Se activa con `PAYMENT_PROVIDER=mercadopago` y `MP_ACCESS_TOKEN`.
- **Pruebas automáticas:** 61 pruebas con Jest + Supertest.

Detalle completo: [docs/SPRINT_3.md](docs/SPRINT_3.md). Documentación del proyecto en la [wiki](https://github.com/davidprimo-ctrl/Mr.Boleta/wiki), incluida la página de [pagos con Mercado Pago](https://github.com/davidprimo-ctrl/Mr.Boleta/wiki/Pagos-con-Mercado-Pago).

## Desarrollo

```bash
# Backend
cd backend
npm install
npm run dev
npm test

# Frontend
cd frontend
npm install
npm run dev
```

Variables de entorno: copiar `backend/.env.example` a `backend/.env` y completar `DATABASE_URL`, `AUTH0_DOMAIN` y `AUTH0_AUDIENCE`.
El pago usa Mercado Pago Checkout Pro (`PAYMENT_PROVIDER=mercadopago` + `MP_ACCESS_TOKEN`) o el modo simulado (`PAYMENT_PROVIDER=mock`). El correo usa Ethereal si no hay `SMTP_HOST`.
