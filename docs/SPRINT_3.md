# Sprint 3 — Mr.Boleta

Versión `v0.3.0`. Alcance: **Swagger**, **panel de administrador**, **reporte de ventas (HU09)** y **pruebas automáticas**.

## Lo que se entregó

| Ítem | Antes | Ahora |
|---|---|---|
| Mis boletas (issue #25) | Listo | Sin cambios |
| Boletas por correo (issue #27) | Listo | Sin cambios |
| API del panel admin (issue #26) | Listo | Sin cambios |
| Swagger / OpenAPI (issue #29) | No existía | `backend/src/docs/openapi.ts` + UI en `/api/docs` |
| Panel admin (interfaz) | No existía | `frontend/src/pages/Admin.tsx` en `/admin` |
| Reporte HU09 | No existía | `GET /api/admin/resumen` + pestaña "Resumen de ventas" |
| Check-in de boletas con QR | No existía | Cámara en `/admin` + `POST /api/admin/boletas/validar` |
| Pruebas Jest + Supertest (issue #28) | No existían | 46 pruebas en `backend/src/tests/` |

## Cómo se usa

### Documentación interactiva

Con el backend encendido:

- `http://localhost:3000` → redirige a Swagger UI.
- `http://localhost:3000/api/docs` → interfaz interactiva.
- `http://localhost:3000/api/docs.json` → documento OpenAPI 3.0.3.

Para ejecutar las rutas con candado 🔒: iniciar sesión en el frontend, copiar el token de Auth0
(F12 → Network → petición `me` → header `Authorization`, **sin** la palabra `Bearer`) y pegarlo en **Authorize**.
El token vence en horas: si da 401, sacarlo de nuevo.

### Panel de administrador

1. En Neon, cambiar el `rol` del usuario a `ADMIN` (el backend lo lee en cada petición).
2. Iniciar sesión en el frontend.
3. El navbar muestra el enlace **Admin** → `/admin`.

Pestañas:

- **Resumen de ventas**: total de ventas aprobadas, ingresos en COP, boletas vendidas y cupos restantes por evento (HU09).
- **Eventos y localidades**: publicar / pasar a borrador / desactivar, editar datos del evento, editar nombre/precio/aforo de cada localidad y agregar localidades.
- **Crear evento**: formulario con una o más localidades; queda en BORRADOR hasta que se publique.
- **Validar boletas (QR)**: check-in con la cámara del celular.

### Check-in de boletas (control de entrada)

En la pestaña **Validar boletas (QR)** del panel, pulsa **Activar cámara** y apunta al QR de cada boleta.
Se mantiene abierta para escanear varias seguidas; al acertar suena un tono agudo y al fallar uno grave.
Si el celular no da permiso, existe un campo de código manual con el mismo resultado.

El backend (`POST /api/admin/boletas/validar`, documentado en Swagger):

1. Busca la boleta por `codigoQr`.
2. Rechaza con **409** si ya está `USADA`, si está `ANULADA` o si su orden no está `APROBADA`.
3. Cambia el estado a `USADA` con `updateMany` condicional (`where: { id, estado: "ACTIVA" }`): aunque dos
   escaneos lleguen al mismo tiempo, solo el primero marca la boleta.
4. Devuelve evento, fecha, localidad, comprador y orden de esa boleta.

> La cámara solo funciona en contexto seguro (HTTPS). Vercel ya sirve HTTPS; en local, `localhost` también vale.
> Para probar en el celular conectado a la PC, hay que usar túnel HTTPS (por ejemplo `ngrok`), no la IP de la red.

Reglas que aplica el backend: no se pueden publicar eventos sin localidades; no se puede bajar el aforo por
debajo de lo vendido o reservado; los eventos no se borran, se desactivan para conservar órdenes y boletas.

### Pagos con Mercado Pago (Checkout Pro)

Con `PAYMENT_PROVIDER=mercadopago`, el backend crea una **preferencia** en COP y redirige al comprador al
checkout de Mercado Pago. Al volver, el frontend envía el `payment_id` a
`POST /api/pagos/mercadopago/confirmar`; el backend consulta el pago real (no confía en el navegador) y
actualiza la orden. El webhook `POST /api/pagos/mercadopago/webhook` hace lo mismo si Mercado Pago avisa
por su cuenta. Ambas rutas son idempotentes: la orden se aprueba una sola vez y las boletas no se duplican.

Variables (en `backend/.env` local y en Render):

```env
PAYMENT_PROVIDER=mercadopago
MP_ACCESS_TOKEN=TEST-...
MP_WEBHOOK_SECRET=        # opcional; si se configura, se valida la firma x-signature
```

- Con token `TEST-` se usa `sandbox_init_point` (dinero de prueba). Con `APP_USR-` se usa `init_point`.
- La URL del webhook se envía en cada preferencia: `${API_URL}/api/pagos/mercadopago/webhook`.
- `PAYMENT_PROVIDER=mock` sigue disponible como respaldo para la demo.

### Pruebas

```bash
cd backend
npm install
npm test              # 60 pruebas, 7 suites
npm run test:coverage # reporte en backend/coverage
```

No requieren base de datos ni Auth0: `src/tests/setupEnv.ts` define variables de entorno de prueba y
`moduleNameMapper` sustituye Auth0 y Prisma por dobles controlados.

Cobertura principal: health y Swagger, catálogo, 401/403 de administración, creación/lectura de órdenes,
pasarela simulada (aprobar, rechazar, vencida), Mercado Pago (preferencia, webhook, confirmación y firma)
y reglas de negocio (reserva atómica, expiración, generación de boletas, envío de correo, cálculo del
reporte y check-in sin duplicados).

## Decisiones y límites

- **Mercado Pago** es la pasarela activa (`PAYMENT_PROVIDER=mercadopago`). Con credenciales de prueba (`TEST-`)
  no se mueve dinero real; para cobrar de verdad hay que activar credenciales productivas y verificar la cuenta.
- **Modo simulado** sigue disponible (`PAYMENT_PROVIDER=mock`) como respaldo para la demo si Mercado Pago falla.
- **Correo** usa Ethereal por defecto (vista previa, no llega a bandejas reales). Para correo real hay que
  configurar `SMTP_*` en `backend/.env` y en Render; nunca subir credenciales a GitHub.
- **Fechas**: `20:00 -05:00` se guarda en UTC como `01:00Z` del día siguiente. No es un error.
- Antes de la demo, reprogramar eventos con fecha pasada: el catálogo oculta los eventos ya ocurridos.

## Pendiente administrativo (fuera del código)

- Cerrar en GitHub los issues #25, #26, #27, #28 y #29 y mover las tarjetas del GitHub Projects.
- Actualizar el wiki y las diapositivas de la entrega con este contenido.
- Subir las ramas y abrir/fusionar los PRs (base `develop`) si se quiere conservar el historial por rama.
