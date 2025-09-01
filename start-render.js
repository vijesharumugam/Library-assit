// Simplified production starter for Render
import('./dist/server.js').catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});