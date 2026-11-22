# Diapositivas — Mr.Boleta (Sustentación Final)

Guion y estructura diapositiva por diapositiva para la presentación de **Ingeniería de Software (6° Semestre)**.

> 💡 **Nota:** También puedes abrir directamente en cualquier navegador el archivo interactivo:  
> [`docs/presentacion.html`](file:///c:/Users/santi/OneDrive/Documentos/Universidad/Sexto%20Semestre/INGSoftware/ProyectoFinalOficial/docs/presentacion.html), el cual cuenta con navegación por teclado y diseño profesional listo para presentar en pantalla completa o imprimir a PDF con `Ctrl + P`.

---

## Diapositiva 1: Portada
- **Título:** Mr.Boleta — Tiquetera Virtual para Eventos Musicales
- **Subtítulo:** Sustentación de Proyecto Final · Ingeniería de Software
- **Versión:** v0.3.7
- **Integrantes y Roles:**
  - **Santiago Primo** (2220241003) — Back-end Developer: API REST, inventario de órdenes y administración.
  - **Juan Berbesí** (2220241090) — Front-end Developer: Catálogo, planos interactivos y UX de boletas.
  - **Sergio Gutiérrez** (2220241016) — Database & DevOps: Neon PostgreSQL, Mercado Pago, QR y despliegue.

---

## Diapositiva 2: Planteamiento del Problema y Propuesta de Valor
- **Problemática en la industria de eventos:**
  - Sobreventa por falta de control de concurrencia cuando miles de usuarios compran al mismo tiempo.
  - Fraude y reventa de entradas por boletas estáticas sin validación criptográfica.
  - Procesos lentos y mapas estáticos poco intuitivos.
- **Solución implementada en Mr.Boleta:**
  - Reserva atómica de cupos por 10 minutos mediante transacciones ACID (todo o nada).
  - Boletas únicas con códigos QR generados con UUID y validados con cámara en tiempo real.
  - Planos vectoriales interactivos con recintos reales de Colombia (Movistar Arena y Vive Claro).

---

## Diapositiva 3: Arquitectura Final del Software
- **Diseño desacoplado en tres capas:**
  1. **Capa de Presentación (Frontend en Vercel):**
     - Single Page Application (SPA) con **React 19**, **TypeScript** y **Vite**.
     - Estilos con **Tailwind CSS v4** y escáner de boletas con **html5-qrcode**.
     - Mapas SVG responsivos con selección sincronizada de puestos y precios.
  2. **Capa de Lógica de Negocio (Backend API en Render):**
     - Servidor **Node.js** con **Express 5** y **TypeScript**.
     - Capa de acceso a datos con **Prisma ORM 7**.
     - Documentación interactiva OpenAPI 3.0.3 en `/api/docs` (Swagger UI).
  3. **Capa de Datos y Servicios en la Nube:**
     - Base de datos relacional serverless **PostgreSQL en Neon Cloud**.
     - Autenticación y control de roles (`COMPRADOR` y `ADMIN`) con **Auth0** (OAuth 2.0 / OIDC).
     - Procesamiento de pagos en pesos colombianos (COP) con **Mercado Pago Checkout Pro**.
     - Envío automático de boletas con QR mediante **Nodemailer**.

---

## Diapositiva 4: Producto Obtenido — Experiencia del Comprador
- **Exploración:** Catálogo público de eventos filtrable por fecha y búsqueda libre.
- **Selección de zonas en mapa real:** Vista interactiva de recintos reales (Movistar Arena y Vive Claro) con identificación por colores, precios sugeridos y aforos.
- **Reserva y Pago:** Creación de orden con retención de cupos por 10 minutos y redirección segura al Checkout Pro de Mercado Pago (o pasarela simulada).
- **Mis Boletas y Correo:** Acceso permanente a las boletas adquiridas con su QR individual y recepción automática del comprobante digital por correo electrónico.

---

## Diapositiva 5: Producto Obtenido — Panel de Administrador (`/admin`)
- **Seguridad RBAC:** Acceso restringido exclusivamente a usuarios con rol `ADMIN`.
- **Reporte de ventas (HU09):** Dashboard gerencial con número de órdenes pagadas, ingresos en COP, boletas vendidas y aforo restante por concierto.
- **Gestión integral de eventos:** Creación y edición de eventos, cambio de estado (Borrador, Publicado, Inactivo) y asignación de planos y zonas.
- **Control de entrada (Check-in QR):** Escaneo en vivo con la cámara del celular que valida la entrada, marca el ticket como `USADA` y rechaza boletas duplicadas o anuladas con tono sonoro.

---

## Diapositiva 6: Retos y Dificultades Técnicas Superadas
1. **Control de Concurrencia y Sobreventa:**
   - *Reto:* Múltiples compradores compitiendo por los últimos cupos.
   - *Solución:* Transacciones atómicas de Prisma con descuento condicional (`WHERE cuposDisponibles >= cantidad`) y barrido de órdenes expiradas.
2. **Idempotencia en Pagos:**
   - *Reto:* Mercado Pago envía avisos repetidos por webhook y el comprador puede recargar la página de retorno.
   - *Solución:* Webhook idempotente con validación de firma criptográfica (`x-signature`) y consulta del estado real en la API de Mercado Pago.
3. **Prevención de Doble Entrada en Portería:**
   - *Reto:* Intento de ingreso simultáneo de dos personas con la misma boleta.
   - *Solución:* Actualización atómica condicional (`WHERE id = boletaId AND estado = 'ACTIVA'`). El primer escaneo cambia a `USADA`; el segundo recibe HTTP 409.
4. **Geometría Paramétrica de los Planos SVG:**
   - *Reto:* Modelar curvas elípticas, cuñas y graderías responsivas para el Movistar Arena y Vive Claro.
   - *Solución:* Algoritmos de conversión polar a cartesiana integrados en componentes React interactivos.

---

## Diapositiva 7: Aseguramiento de Calidad y Pruebas Automatizadas
- **66 Pruebas Automatizadas** ejecutadas con **Jest** y **Supertest**.
- **7 Suites de Test** cubriendo:
  - Sistema, salud y documentación Swagger (`sistema.test.ts`).
  - Catálogo público y búsquedas (`catalogo.test.ts`).
  - Creación de órdenes y expiración automática (`ordenes.test.ts`).
  - Seguridad y roles del panel admin (`admin.test.ts`).
  - Pasarela simulada y Checkout Pro (`pagos.test.ts` y `mercadopago.test.ts`).
  - Lógica de negocio y transacciones de cupos (`servicios.test.ts`).
- **Aislamiento:** Mocks controlados para Auth0 y Prisma, permitiendo ejecutar toda la suite sin depender de bases de datos externas ni conexión a internet.

---

## Diapositiva 8: Conclusiones y Demostración en Vivo
- **Enlaces oficiales:**
  - Aplicación Web: [https://mr-boleta.vercel.app](https://mr-boleta.vercel.app)
  - API Backend: [https://mr-boleta-api.onrender.com/api/eventos](https://mr-boleta-api.onrender.com/api/eventos)
  - Documentación Swagger: [https://mr-boleta-api.onrender.com/api/docs](https://mr-boleta-api.onrender.com/api/docs)
  - Wiki del Proyecto: [https://github.com/davidprimo-ctrl/Mr.Boleta/wiki](https://github.com/davidprimo-ctrl/Mr.Boleta/wiki)
- **Pase a la demostración en directo del flujo de compra y validación QR.**
