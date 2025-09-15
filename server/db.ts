// Database connection using PostgreSQL with Prisma
import { PrismaClient } from '@prisma/client';

// Create Prisma client with PostgreSQL connection
function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma: PrismaClient = createPrismaClient();

// Gracefully close the connection when the process exits (only if prisma exists)
process.on('beforeExit', async () => {
  if (prisma) await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  if (prisma) await prisma.$disconnect();
  process.exit();
});

process.on('SIGTERM', async () => {
  if (prisma) await prisma.$disconnect();
  process.exit();
});