import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

console.log('🚀 Starting production server...');
console.log('📁 Current working directory:', process.cwd());

(async () => {
  try {
    // Register API routes first
    const server = await registerRoutes(app);
    console.log('✅ Routes registered successfully');

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('❌ Server error:', err);
      res.status(status).json({ message });
    });

    // Serve static files in production
    const distPath = path.resolve(process.cwd(), "dist", "public");
    console.log('📂 Looking for static files at:', distPath);
    
    if (fs.existsSync(distPath)) {
      console.log('✅ Static files found, serving from:', distPath);
      app.use(express.static(distPath));
      
      // Serve React app for all non-API routes
      app.use("*", (_req, res) => {
        const indexPath = path.resolve(distPath, "index.html");
        console.log('📄 Serving index.html from:', indexPath);
        res.sendFile(indexPath);
      });
    } else {
      console.error('❌ Build directory not found:', distPath);
      console.log('📁 Available files:', fs.readdirSync(process.cwd()));
      
      app.use("*", (_req, res) => {
        res.status(502).json({ 
          message: "Static files not found. Build may have failed.",
          path: distPath
        });
      });
    }

    const port = parseInt(process.env.PORT || '5000', 10);
    console.log(`🔧 Starting server on port ${port}...`);
    
    server.listen(port, '0.0.0.0', () => {
      console.log(`✅ Production server running on port ${port}`);
      console.log(`🌐 Server ready at http://0.0.0.0:${port}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();