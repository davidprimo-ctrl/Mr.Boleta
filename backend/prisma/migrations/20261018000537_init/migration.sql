-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('COMPRADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('BORRADOR', 'PUBLICADO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "EstadoBoleta" AS ENUM ('ACTIVA', 'USADA', 'ANULADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "auth0Id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'COMPRADOR',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "artista" TEXT NOT NULL,
    "lugar" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "imagenUrl" TEXT,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'BORRADOR',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Localidad" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "aforo" INTEGER NOT NULL,
    "cuposDisponibles" INTEGER NOT NULL,
    "eventoId" INTEGER NOT NULL,

    CONSTRAINT "Localidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orden" (
    "id" SERIAL NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'PENDIENTE',
    "total" DECIMAL(12,2) NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "referenciaPago" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,
    "eventoId" INTEGER NOT NULL,

    CONSTRAINT "Orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleOrden" (
    "id" SERIAL NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "ordenId" INTEGER NOT NULL,
    "localidadId" INTEGER NOT NULL,

    CONSTRAINT "DetalleOrden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boleta" (
    "id" SERIAL NOT NULL,
    "codigoQr" TEXT NOT NULL,
    "estado" "EstadoBoleta" NOT NULL DEFAULT 'ACTIVA',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detalleOrdenId" INTEGER NOT NULL,

    CONSTRAINT "Boleta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_auth0Id_key" ON "Usuario"("auth0Id");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Localidad_eventoId_nombre_key" ON "Localidad"("eventoId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Orden_referenciaPago_key" ON "Orden"("referenciaPago");

-- CreateIndex
CREATE UNIQUE INDEX "Boleta_codigoQr_key" ON "Boleta"("codigoQr");

-- AddForeignKey
ALTER TABLE "Localidad" ADD CONSTRAINT "Localidad_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrden" ADD CONSTRAINT "DetalleOrden_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrden" ADD CONSTRAINT "DetalleOrden_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boleta" ADD CONSTRAINT "Boleta_detalleOrdenId_fkey" FOREIGN KEY ("detalleOrdenId") REFERENCES "DetalleOrden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
