// Production startup script for Render deployment
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function startProduction() {
  try {
    console.log('🔧 Generating Prisma client...');
    await execAsync('npx prisma generate');
    
    console.log('🚀 Starting production server...');
    // Import and start the main server
    await import('./dist/index.js');
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

startProduction();