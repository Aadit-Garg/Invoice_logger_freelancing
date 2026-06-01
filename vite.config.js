import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataFilePath = path.resolve(__dirname, 'data.json')

const localDatabasePlugin = () => ({
  name: 'local-database-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const urlPath = req.url.split('?')[0];
      if (urlPath === '/api/data') {
        if (req.method === 'GET') {
          let data = '[]';
          if (fs.existsSync(dataFilePath)) {
            try {
              data = fs.readFileSync(dataFilePath, 'utf8') || '[]';
            } catch (e) {
              console.error('Failed to read data.json:', e);
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(data);
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              // Ensure we got valid JSON before saving to avoid corrupting data
              JSON.parse(body);
              fs.writeFileSync(dataFilePath, body, 'utf8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              console.error('Failed to save or parse data.json:', e);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON or write error' }));
            }
          });
          return;
        }
      }
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localDatabasePlugin()],
})
