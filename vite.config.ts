import { defineConfig } from 'vite';
export default defineConfig({ server: { port: 5175, strictPort: true, proxy: { '/api/site': 'http://127.0.0.1:8081', '/api/weddings': 'http://127.0.0.1:8082' } }, preview: { port: 5175 } });
