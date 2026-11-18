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
| Pruebas Jest + Supertest (issue #28) | No existían | 38 pruebas en `backend/src/tests/` |

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

Reglas que aplica el backend: no se pueden publicar eventos sin localidades; no se puede bajar el aforo por
debajo de lo vendido o reservado; los eventos no se borran, se desactivan para conservar órdenes y boletas.

### Pruebas

```bash
cd backend
npm install
npm test              # 38 pruebas, 6 suites
npm run test:coverage # reporte en backend/coverage
```

No requieren base de datos ni Auth0: `src/tests/setupEnv.ts` define variables de entorno de prueba y
`moduleNameMapper` sustituye Auth0 y Prisma por dobles controlados.

Cobertura principal: health y Swagger, catálogo, 401/403 de administración, creación/lectura de órdenes,
pasarela simulada (aprobar, rechazar, vencida) y reglas de negocio (reserva atómica, expiración,
generación de boletas, envío de correo y cálculo del reporte).

## Decisiones y límites

- **Wompi** sigue en modo simulado (`PAYMENT_PROVIDER=mock`). El adaptador real existe en
  `backend/src/services/pagos/wompi.ts`, pero Wompi exige RUT para entregar llaves de prueba (riesgo documentado en el Avance 2).
- **Correo** usa Ethereal por defecto (vista previa, no llega a bandejas reales). Para correo real hay que
  configurar `SMTP_*` en `backend/.env` y en Render; nunca subir credenciales a GitHub.
- **Fechas**: `20:00 -05:00` se guarda en UTC como `01:00Z` del día siguiente. No es un error.
- Antes de la demo, reprogramar eventos con fecha pasada: el catálogo oculta los eventos ya ocurridos.

## Pendiente administrativo (fuera del código)

- Cerrar en GitHub los issues #25, #26, #27, #28 y #29 y mover las tarjetas del GitHub Projects.
- Actualizar el wiki y las diapositivas de la entrega con este contenido.
- Subir las ramas y abrir/fusionar los PRs (base `develop`) si se quiere conservar el historial por rama.
