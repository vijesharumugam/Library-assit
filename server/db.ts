// Database connection using MongoDB with Prisma
import { PrismaClient } from '@prisma/client';

// Create Prisma client with MongoDB connection
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

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