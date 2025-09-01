// Ultra-simple production starter for Render
console.log('Starting server...');

try {
  // Use the existing built server
  import('./dist/index.js')
    .then(() => console.log('✅ Server started successfully'))
    .catch(error => {
      console.error('❌ Server failed to start:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Import failed:', error);
  process.exit(1);
}