import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/ · https://vitest.dev/config/
export default defineConfig({
  // Se publica en Vercel en la raíz del dominio (vercel.json en la raíz del repo). Si algún día se sirve
  // bajo una subruta (p. ej. GitHub Pages: '/nasa_challenge/'), basta cambiar esto: asset() lo respeta.
  base: '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/app/test-setup.ts'],
    // La primera prueba de cada archivo carga el catálogo real y el globo: 5 s se quedaban cortos con la máquina ocupada.
    testTimeout: 15000,
  },
})
