import { defineConfig } from 'vite' 
import react from '@vitejs/plugin-react'

const backend = 'https://localhost:7067/';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, 
    proxy: {
      '^/login|^/register|^/protected|^/api': {
        target: backend,
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: '../wwwroot', // write production files to Cinematica/wwwroot
    emptyOutDir: true
  }
});
