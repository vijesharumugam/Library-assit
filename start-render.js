// Production starter for Render with error handling
console.log('🚀 Starting Render deployment...');

// Ensure Prisma client is generated
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function start() {
  try {
    console.log('🔧 Ensuring Prisma client is generated...');
    await execAsync('npx prisma generate');
    
    console.log('📦 Starting server...');
    await import('./dist/server.js');
  } catch (error) {
    console.error('❌ Failed to start:', error);
    console.error('📊 Error details:', error.message);
    process.exit(1);
  }
}

start();