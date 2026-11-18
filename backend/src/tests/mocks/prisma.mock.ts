/** Cliente Prisma falso: cada prueba define los resultados con prisma.modelo.fn.mockResolvedValue(...). */
interface ClienteFalso {
  evento: Record<string, jest.Mock>;
  localidad: Record<string, jest.Mock>;
  orden: Record<string, jest.Mock>;
  detalleOrden: Record<string, jest.Mock>;
  boleta: Record<string, jest.Mock>;
  usuario: Record<string, jest.Mock>;
  $transaction: jest.Mock;
}

export const prisma: ClienteFalso = {
  evento: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  localidad: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  orden: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  detalleOrden: { findMany: jest.fn() },
  boleta: { findMany: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), createMany: jest.fn() },
  usuario: { findUnique: jest.fn(), upsert: jest.fn() },
  // Las transacciones ejecutan la callback con este mismo cliente falso.
  $transaction: jest.fn(async (callback: (cliente: ClienteFalso) => unknown) => callback(prisma)),
};
