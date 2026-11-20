-- AlterTable
ALTER TABLE "Evento" ADD COLUMN     "mapa" TEXT NOT NULL DEFAULT 'generico';

-- AlterTable
ALTER TABLE "Localidad" ADD COLUMN     "zona" TEXT;
