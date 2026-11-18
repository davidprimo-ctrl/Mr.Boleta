import { env } from "../config/env";

/** Respuesta de error estándar de la API: { "error": "mensaje" } */
const error = (descripcion: string) => ({
  description: descripcion,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

const json = (schema: object) => ({ "application/json": { schema } });
const ref = (nombre: string) => ({ $ref: `#/components/schemas/${nombre}` });
const idEnRuta = (descripcion: string) => ({
  name: "id",
  in: "path",
  required: true,
  description: descripcion,
  schema: { type: "integer", example: 1 },
});

const conSesion = [{ bearerAuth: [] }];

/** Documentación OpenAPI 3 de la API de Mr.Boleta (se muestra con Swagger UI en /api/docs). */
export const documentoOpenApi = {
  openapi: "3.0.3",
  info: {
    title: "Mr.Boleta API",
    version: "0.3.0",
    description:
      "API de la tiquetera virtual Mr.Boleta: catálogo de eventos, órdenes con reserva de cupos por 10 minutos, " +
      "pagos (pasarela simulada o Wompi), boletas con código QR, panel de administrador y reporte de ventas.\n\n" +
      "**Para probar las rutas con candado 🔒:** inicia sesión en la página, copia tu token de Auth0 " +
      "(F12 → Network → petición `me` → header `Authorization`, sin la palabra `Bearer`) y pégalo en el botón **Authorize**.",
  },
  servers: [{ url: env.API_URL, description: "Servidor actual" }],
  tags: [
    { name: "Sistema", description: "Estado del servidor y documentación" },
    { name: "Catálogo", description: "Eventos publicados (público, sin sesión)" },
    { name: "Usuarios", description: "Usuario que inició sesión con Google (Auth0)" },
    { name: "Órdenes", description: "Compra de boletas con reserva de cupos por 10 minutos" },
    { name: "Pagos", description: "Inicio del pago en la pasarela (mock o Wompi)" },
    { name: "Administración", description: "Gestión de eventos, localidades y reportes (solo rol ADMIN)" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Sistema"],
        summary: "Verifica que el servidor esté activo",
        responses: {
          200: { description: "Servidor activo", content: json({ type: "object", example: { status: "ok", app: "Mr.Boleta API" } }) },
        },
      },
    },

    "/api/eventos": {
      get: {
        tags: ["Catálogo"],
        summary: "Lista los eventos publicados y futuros",
        parameters: [
          {
            name: "q",
            in: "query",
            required: false,
            description: "Texto a buscar en el nombre, artista, ciudad o lugar (sin importar mayúsculas)",
            schema: { type: "string", example: "rock" },
          },
        ],
        responses: {
          200: { description: "Lista de eventos con sus localidades", content: json({ type: "array", items: ref("Evento") }) },
        },
      },
    },
    "/api/eventos/{id}": {
      get: {
        tags: ["Catálogo"],
        summary: "Detalle de un evento publicado",
        parameters: [idEnRuta("Id del evento")],
        responses: {
          200: { description: "El evento con sus localidades", content: json(ref("Evento")) },
          400: error("El id no es un número entero positivo"),
          404: error("El evento no existe o no está publicado"),
        },
      },
    },

    "/api/usuarios/me": {
      get: {
        tags: ["Usuarios"],
        summary: "Usuario que inició sesión (se registra en la base de datos la primera vez)",
        security: conSesion,
        responses: {
          200: { description: "Datos del usuario y su rol", content: json(ref("Usuario")) },
          401: error("Sin token o token inválido"),
        },
      },
    },

    "/api/ordenes": {
      get: {
        tags: ["Órdenes"],
        summary: "Mis órdenes, de la más reciente a la más antigua (con sus boletas)",
        security: conSesion,
        responses: {
          200: { description: "Lista de órdenes", content: json({ type: "array", items: ref("Orden") }) },
          401: error("Sin token o token inválido"),
        },
      },
      post: {
        tags: ["Órdenes"],
        summary: "Crea una orden PENDIENTE y reserva los cupos por 10 minutos",
        description:
          "Todo ocurre en una transacción: si una localidad no tiene cupos suficientes, no se reserva nada. " +
          "Máximo 10 boletas por orden. Si no se paga en 10 minutos, la orden pasa a EXPIRADA y los cupos se liberan.",
        security: conSesion,
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["eventoId", "items"],
            properties: {
              eventoId: { type: "integer", example: 4 },
              items: {
                type: "array",
                items: {
                  type: "object",
                  required: ["localidadId", "cantidad"],
                  properties: {
                    localidadId: { type: "integer", example: 8 },
                    cantidad: { type: "integer", minimum: 1, example: 2 },
                  },
                },
              },
            },
          }),
        },
        responses: {
          201: { description: "Orden creada con los cupos reservados", content: json(ref("Orden")) },
          400: error("Datos inválidos o más de 10 boletas"),
          401: error("Sin token o token inválido"),
          404: error("Evento o localidad no encontrados"),
          409: error("No hay cupos suficientes o el evento ya ocurrió"),
        },
      },
    },
    "/api/ordenes/{id}": {
      get: {
        tags: ["Órdenes"],
        summary: "Una de mis órdenes",
        security: conSesion,
        parameters: [idEnRuta("Id de la orden")],
        responses: {
          200: { description: "La orden con sus detalles y boletas", content: json(ref("Orden")) },
          400: error("Id inválido"),
          401: error("Sin token o token inválido"),
          404: error("La orden no existe o es de otro usuario"),
        },
      },
    },

    "/api/pagos/ordenes/{id}": {
      post: {
        tags: ["Pagos"],
        summary: "Inicia el pago de mi orden y devuelve la URL de la pasarela",
        description:
          "La pasarela depende de PAYMENT_PROVIDER: `mock` (simulada) o `wompi`. Al aprobarse el pago se generan " +
          "las boletas con QR y se envían por correo.",
        security: conSesion,
        parameters: [idEnRuta("Id de la orden")],
        responses: {
          200: {
            description: "URL a la que se envía al comprador",
            content: json({ type: "object", properties: { urlPago: { type: "string", example: "http://localhost:3000/api/pagos/mock/15" } } }),
          },
          401: error("Sin token o token inválido"),
          404: error("Orden no encontrada"),
          409: error("La reserva ya no está vigente"),
        },
      },
    },
    "/api/pagos/mock/{id}": {
      get: {
        tags: ["Pagos"],
        summary: "Página de pago simulada (solo con PAYMENT_PROVIDER=mock)",
        description: "Devuelve HTML con botones para aprobar o rechazar la orden de prueba.",
        parameters: [idEnRuta("Id de la orden")],
        responses: {
          200: { description: "Página HTML de la pasarela de prueba" },
          404: error("Orden no encontrada"),
        },
      },
    },
    "/api/pagos/mock/{id}/{resultado}": {
      post: {
        tags: ["Pagos"],
        summary: "Confirma el resultado simulado y redirige a la orden",
        description:
          "Con `aprobar` se generan las boletas y se envían por correo; con `rechazar` se liberan los cupos. " +
          "Siempre redirige (303) a `/ordenes/{id}` del frontend.",
        parameters: [
          idEnRuta("Id de la orden"),
          {
            name: "resultado",
            in: "path",
            required: true,
            description: "Resultado del pago",
            schema: { type: "string", enum: ["aprobar", "rechazar"], example: "aprobar" },
          },
        ],
        responses: {
          303: { description: "Redirección a la página de la orden" },
          400: error("Resultado inválido"),
        },
      },
    },

    "/api/admin/resumen": {
      get: {
        tags: ["Administración"],
        summary: "Reporte de ventas, ingresos y cupos restantes (HU09)",
        description:
          "Totales generales y por evento: órdenes aprobadas, ingresos en pesos colombianos, boletas vendidas, " +
          "aforo y cupos disponibles. Solo cuenta pagos APROBADOS.",
        security: conSesion,
        responses: {
          200: { description: "Resumen general y detalle por evento", content: json(ref("ResumenAdmin")) },
          401: error("Sin token o token inválido"),
          403: error("El usuario no es ADMIN"),
        },
      },
    },
    "/api/admin/boletas/validar": {
      post: {
        tags: ["Administración"],
        summary: "Check-in: valida una boleta escaneando su QR",
        description:
          "Marca la boleta como USADA devolviendo sus datos. Si ya estaba usada, anulada o su orden no está aprobada " +
          "responde 409, así una segunda lectura no cuenta dos veces. El cambio es atómico (updateMany condicional).",
        security: conSesion,
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["codigoQr"],
            properties: { codigoQr: { type: "string", format: "uuid", example: "3f8a2c1e-9b7d-4e5f-a1b2-c3d4e5f6a7b8" } },
          }),
        },
        responses: {
          200: { description: "Boleta validada correctamente", content: json(ref("BoletaValidada")) },
          400: error("Falta el código QR"),
          401: error("Sin token o token inválido"),
          403: error("El usuario no es ADMIN"),
          404: error("No existe una boleta con ese código QR"),
          409: error("La boleta ya fue usada, está anulada o la orden no está aprobada"),
        },
      },
    },
    "/api/admin/eventos": {
      get: {
        tags: ["Administración"],
        summary: "Lista todos los eventos (borrador, publicados e inactivos)",
        security: conSesion,
        responses: {
          200: { description: "Lista de eventos", content: json({ type: "array", items: ref("Evento") }) },
          401: error("Sin token o token inválido"),
          403: error("El usuario no es ADMIN"),
        },
      },
      post: {
        tags: ["Administración"],
        summary: "Crea un evento en BORRADOR con sus localidades",
        security: conSesion,
        requestBody: {
          required: true,
          content: json({
            allOf: [
              ref("DatosEvento"),
              {
                type: "object",
                required: ["localidades"],
                properties: { localidades: { type: "array", minItems: 1, items: ref("DatosLocalidad") } },
              },
            ],
          }),
        },
        responses: {
          201: { description: "Evento creado (estado BORRADOR)", content: json(ref("Evento")) },
          400: error("Datos inválidos, sin localidades o con nombres repetidos"),
          401: error("Sin token o token inválido"),
          403: error("El usuario no es ADMIN"),
        },
      },
    },
    "/api/admin/eventos/{id}": {
      get: {
        tags: ["Administración"],
        summary: "Un evento en cualquier estado",
        security: conSesion,
        parameters: [idEnRuta("Id del evento")],
        responses: {
          200: { description: "El evento", content: json(ref("Evento")) },
          400: error("Id inválido"),
          403: error("El usuario no es ADMIN"),
          404: error("Evento no encontrado"),
        },
      },
      put: {
        tags: ["Administración"],
        summary: "Edita los datos del evento (solo los campos enviados)",
        security: conSesion,
        parameters: [idEnRuta("Id del evento")],
        requestBody: { required: true, content: json({ type: "object", example: { lugar: "Plaza de Bolívar" }, ...ref("DatosEvento") }) },
        responses: {
          200: { description: "Evento actualizado", content: json(ref("Evento")) },
          400: error("Algún campo enviado es inválido"),
          403: error("El usuario no es ADMIN"),
          404: error("Evento no encontrado"),
        },
      },
    },
    "/api/admin/eventos/{id}/estado": {
      patch: {
        tags: ["Administración"],
        summary: "Publica, pasa a borrador o desactiva un evento",
        description: "Los eventos no se borran: se desactivan, para conservar las órdenes y boletas vendidas.",
        security: conSesion,
        parameters: [idEnRuta("Id del evento")],
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["estado"],
            properties: { estado: { type: "string", enum: ["BORRADOR", "PUBLICADO", "INACTIVO"], example: "PUBLICADO" } },
          }),
        },
        responses: {
          200: { description: "Estado actualizado", content: json(ref("Evento")) },
          400: error("Estado inválido"),
          403: error("El usuario no es ADMIN"),
          404: error("Evento no encontrado"),
          409: error("No se puede publicar un evento sin localidades"),
        },
      },
    },
    "/api/admin/eventos/{id}/localidades": {
      post: {
        tags: ["Administración"],
        summary: "Agrega una localidad a un evento",
        security: conSesion,
        parameters: [idEnRuta("Id del evento")],
        requestBody: { required: true, content: json(ref("DatosLocalidad")) },
        responses: {
          201: { description: "Localidad creada", content: json(ref("Localidad")) },
          400: error("Datos inválidos"),
          403: error("El usuario no es ADMIN"),
          404: error("Evento no encontrado"),
          409: error("Ya existe una localidad con ese nombre en el evento"),
        },
      },
    },
    "/api/admin/localidades/{id}": {
      put: {
        tags: ["Administración"],
        summary: "Edita nombre, precio y/o aforo de una localidad",
        description:
          "Si cambia el aforo, los cupos disponibles se ajustan en la misma diferencia. " +
          "No se puede bajar el aforo por debajo de lo vendido o reservado.",
        security: conSesion,
        parameters: [idEnRuta("Id de la localidad")],
        requestBody: { required: true, content: json({ type: "object", example: { precio: 95000, aforo: 250 }, ...ref("DatosLocalidad") }) },
        responses: {
          200: { description: "Localidad actualizada", content: json(ref("Localidad")) },
          400: error("Datos inválidos"),
          403: error("El usuario no es ADMIN"),
          404: error("Localidad no encontrada"),
          409: error("Nombre repetido o aforo menor a lo vendido"),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Token de acceso de Auth0" },
    },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string", example: "Evento no encontrado" } } },
      Localidad: {
        type: "object",
        properties: {
          id: { type: "integer", example: 8 },
          nombre: { type: "string", example: "General" },
          precio: { type: "string", description: "Pesos colombianos (Decimal enviado como texto)", example: "80000" },
          aforo: { type: "integer", example: 500 },
          cuposDisponibles: { type: "integer", example: 498 },
          eventoId: { type: "integer", example: 1 },
        },
      },
      Evento: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          nombre: { type: "string", example: "Festival Andino de Rock" },
          descripcion: { type: "string" },
          artista: { type: "string", example: "Varios artistas" },
          lugar: { type: "string", example: "Estadio Manuel Murillo Toro" },
          ciudad: { type: "string", example: "Ibagué" },
          fecha: { type: "string", format: "date-time" },
          imagenUrl: { type: "string", nullable: true },
          estado: { type: "string", enum: ["BORRADOR", "PUBLICADO", "INACTIVO"] },
          localidades: { type: "array", items: ref("Localidad") },
        },
      },
      DatosEvento: {
        type: "object",
        required: ["nombre", "descripcion", "artista", "lugar", "ciudad", "fecha"],
        properties: {
          nombre: { type: "string", example: "Noche de Salsa Brava" },
          descripcion: { type: "string", example: "Las mejores orquestas de salsa en una sola noche." },
          artista: { type: "string", example: "Varios artistas" },
          lugar: { type: "string", example: "Coliseo Mayor" },
          ciudad: { type: "string", example: "Ibagué" },
          fecha: { type: "string", format: "date-time", example: "2026-12-20T20:00:00-05:00" },
          imagenUrl: { type: "string", nullable: true, example: "https://picsum.photos/seed/salsa/800/450" },
        },
      },
      DatosLocalidad: {
        type: "object",
        required: ["nombre", "precio", "aforo"],
        properties: {
          nombre: { type: "string", example: "VIP" },
          precio: { type: "number", example: 220000 },
          aforo: { type: "integer", example: 60 },
        },
      },
      Usuario: {
        type: "object",
        properties: {
          id: { type: "integer", example: 3 },
          email: { type: "string", example: "comprador@gmail.com" },
          nombre: { type: "string", example: "Comprador de prueba" },
          rol: { type: "string", enum: ["COMPRADOR", "ADMIN"] },
        },
      },
      Boleta: {
        type: "object",
        properties: {
          id: { type: "integer" },
          codigoQr: { type: "string", format: "uuid" },
          estado: { type: "string", enum: ["ACTIVA", "USADA", "ANULADA"] },
        },
      },
      Orden: {
        type: "object",
        properties: {
          id: { type: "integer", example: 15 },
          estado: { type: "string", enum: ["PENDIENTE", "APROBADA", "RECHAZADA", "EXPIRADA"] },
          total: { type: "string", example: "120000" },
          expiraEn: { type: "string", format: "date-time" },
          referenciaPago: { type: "string", nullable: true },
          evento: { type: "object", properties: { id: { type: "integer" }, nombre: { type: "string" }, fecha: { type: "string", format: "date-time" } } },
          detalles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                cantidad: { type: "integer", example: 2 },
                precioUnitario: { type: "string", example: "60000" },
                subtotal: { type: "string", example: "120000" },
                localidad: { type: "object", properties: { id: { type: "integer" }, nombre: { type: "string" } } },
                boletas: { type: "array", items: ref("Boleta") },
              },
            },
          },
        },
      },
      BoletaValidada: {
        type: "object",
        properties: {
          id: { type: "integer", example: 21 },
          codigoQr: { type: "string", format: "uuid" },
          estado: { type: "string", enum: ["USADA"] },
          evento: { type: "object", properties: { id: { type: "integer" }, nombre: { type: "string" }, fecha: { type: "string", format: "date-time" }, lugar: { type: "string" }, ciudad: { type: "string" } } },
          localidad: { type: "string", example: "VIP" },
          comprador: { type: "object", properties: { nombre: { type: "string" }, email: { type: "string" } } },
          orden: { type: "object", properties: { id: { type: "integer" }, total: { type: "number" }, referenciaPago: { type: "string", nullable: true } } },
          validadaEn: { type: "string", format: "date-time" },
        },
      },
      ResumenAdmin: {
        type: "object",
        properties: {
          totalVentas: { type: "integer", description: "Órdenes aprobadas", example: 12 },
          ingresos: { type: "number", description: "Ingresos totales en COP", example: 1450000 },
          boletasVendidas: { type: "integer", example: 27 },
          aforoTotal: { type: "integer", example: 600 },
          cuposDisponibles: { type: "integer", example: 573 },
          eventos: { type: "array", items: ref("EventoResumen") },
        },
      },
      EventoResumen: {
        type: "object",
        properties: {
          id: { type: "integer", example: 7 },
          nombre: { type: "string", example: "Noche de Salsa Brava" },
          fecha: { type: "string", format: "date-time" },
          estado: { type: "string", enum: ["BORRADOR", "PUBLICADO", "INACTIVO"] },
          ventas: { type: "integer", example: 5 },
          ingresos: { type: "number", example: 620000 },
          boletasVendidas: { type: "integer", example: 9 },
          aforoTotal: { type: "integer", example: 200 },
          cuposDisponibles: { type: "integer", example: 191 },
        },
      },
    },
  },
};
