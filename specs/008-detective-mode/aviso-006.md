# Aviso para quien lleva 006 · lo que 008-detective-mode toca en la tarjeta de bienvenida

Pégalo en el chat del equipo o en tu sesión de Claude Code (rama `006-guide-content` o la que uses).

---

```text
Hola. La rama 008-detective-mode (spec en specs/008-detective-mode/spec.md) añade un «Modo detective» a la
portada. Vive en web/src/features/guide/detective/ (carpeta nueva) y toca tres cosas de 006, todas mínimas:

1. WelcomeCard.tsx
   - El segundo ejemplo deja de ser «Próximamente» y abre Hidalgo · Precipitación
     (openExample('MX-HID', 'precipitation')): un caso real con evidencia insuficiente.
   - Una importación nueva (`import { DetectiveMode } from './detective'`) y `<DetectiveMode />` debajo de
     los ejemplos.

2. content/index.ts
   - Un bloque nuevo «Modo detective (008)» entre `fmtP` y `explainTrend`: `DETECTIVE_COPY`,
     `revealPrediction` y sus tipos. No cambia `VARIABLE_COPY`, `UI_COPY`, `explainTrend` ni las importaciones.
   - La frase de la revelación respeta vuestra decisión del 2026-11-14: con evidencia insuficiente no se
     menciona dirección ni pendiente.

3. Una regla CSS que cambia el aspecto de vuestros ejemplos (está en detective/detective.css, no en guide.css):
     .welcome-card:has(.detective) .welcome-examples { display: grid; grid-template-columns: 1fr 1fr }
   Motivo: con el botón nuevo la tarjeta crecía ~73 px hacia arriba y tapaba «Ver tabla / Vista global» de la
   leyenda (005). Con los dos ejemplos lado a lado la tarjeta queda bajo la leyenda (medido en una ventana de
   912 px de alto: tarjeta desde y=503, leyenda hasta y=427).
   Si preferís otra solución (p. ej. ejemplos más compactos en guide.css o mover el botón), decídmelo y
   retiro esta regla; si os parece bien, no hace falta hacer nada.

Nada de esto cambia textos ni pruebas vuestras. Las pruebas de la app pasan (npm run test).
```
