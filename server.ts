import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './server/db.js';
import { apiRouter } from './server/routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize SQLite database and seed initial data
  initDatabase();

  // Ensure uploads directory exists on server / Railway persistent storage
  const uploadsDir = path.resolve(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Middleware
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Static serving for uploaded files (e.g. /uploads/image.jpg)
  app.use('/uploads', express.static(uploadsDir));

  // Mount API Router under /api/v1
  app.use('/api/v1', apiRouter);

  // Development: Vite middlewares
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BMS Server] Business Management System running on http://0.0.0.0:${PORT}`);
    console.log(`[BMS Server] API available at http://0.0.0.0:${PORT}/api/v1/health`);
  });
}

startServer().catch((err) => {
  console.error('[BMS Server] Startup failure:', err);
  process.exit(1);
});
