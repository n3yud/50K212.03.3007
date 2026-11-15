import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Khi nối Backend ASP.NET Core, mở comment "proxy" để gọi /api không bị lỗi CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // proxy: { '/api': 'https://localhost:7001' },
  },
});
