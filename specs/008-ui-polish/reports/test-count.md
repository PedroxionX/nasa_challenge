# Recuento de pruebas: 261 → 254

Comprobado el 2026-11-15 ejecutando `npx vitest run --reporter=json` en `1805936` (base de 008, integra-main) y en la punta de `008-ui-polish`.

| Archivo | Base | 008 |
|---|---|---|
| `src/styles/tokens.test.ts` | 24 | 17 |
| `src/features/analysis/format.test.ts` → `src/lib/format.test.ts` (movido) | 12 | 12 |
| Resto (15 archivos) | 225 | 225 |
| **Total** | **261** | **254** |

La diferencia está entera en `tokens.test.ts`:

- **−8**: el `it.each` «el alias --X resuelve a --color-Y» (bg, surface, surface-2, border, text, muted, accent, on-accent). Los alias se retiraron en `31cfde3`, así que no queda nada que comprobar.
- **+1**: «ningún CSS usa una variable sin definir en tokens.css». Recorre todos los `.css` de `src/` y falla si alguna `var()` apunta a una variable inexistente, lo que cubre el riesgo que vigilaban los alias (un uso que se quedara sin definir) de forma más amplia.

Ningún otro archivo pierde pruebas: los nombres coinciden uno a uno.

Nota: en la base, 5 pruebas fallaban (256/261 pasaban; una de ellas era `Shell sin WebGL (jsdom) › el armazón sigue en pie con sus zonas`). En 008 pasan las 254.
