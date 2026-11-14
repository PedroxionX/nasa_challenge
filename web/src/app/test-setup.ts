/**
 * Preparación común de Vitest (la carga vite.config.ts para todas las pruebas).
 * jsdom no implementa canvas: devolver null evita su aviso y equivale a «sin WebGL».
 */
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
