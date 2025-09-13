// Database connection disabled - using in-memory storage for development
// This file is kept for potential future database integration

import { PrismaClient } from '@prisma/client';

// Only create Prisma client if MongoDB URI is provided (optional for development)
export const prisma = process.env.MONGODB_URI ? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
}) : null;

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