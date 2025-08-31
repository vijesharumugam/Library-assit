import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const prisma = new PrismaClient();

// Gracefully close the connection when the process exits
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});