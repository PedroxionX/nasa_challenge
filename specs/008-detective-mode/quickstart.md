# Quickstart: validar el modo detective

## Preparar

```bash
cd web
npm install          # solo si no lo has hecho
npm run test         # deben pasar todas, incluidas las de features/guide/detective
npx tsc --noEmit
npm run dev          # http://localhost:5173
```

## Escenarios (criterio «Acepta» de la spec)

| # | Pasos | Resultado esperado |
|---|---|---|
| Q1 | Abrir la portada | Dos ejemplos activos (Baja California y Chihuahua · Temperatura, de 006) y el botón «Modo detective». Ningún «Próximamente». |
| Q2 | Pulsar el segundo ejemplo | Análisis de Chihuahua con temperatura (ejemplo de 006, no de 008). |
| Q3 | Detective → «¿Llueve más o menos…?» → Trópico húmedo → «Disminuyó» | Se nombra la región elegida; la revelación muestra veredicto, cambio %/década, periodo, años, p y α; la frase separa dirección y evidencia. |
| Q4 | En la revelación, «Ver el análisis completo» | Se abre el análisis de esa región y variable; sus cifras coinciden con las de la revelación. |
| Q5 | Detective → Temperatura → Mi estado → «Washington D.C.» (en el selector aparece con el nombre del catálogo) → «No sé» | Revelación sin juicio de acierto, con aviso de región pequeña. |
| Q6 | Detective → Sorpréndeme, salir, repetir | Casos distintos de la lista curada; solo variables publicadas. |
| Q7 | En cualquier paso, «Atrás» y «Salir» | Vuelve al paso anterior / a la portada; el foco va al título del paso o al botón de entrada. |
| Q8 | Recorrer todo solo con teclado (Tab, Enter, Espacio, flechas en el selector) | Se completa sin ratón; foco visible. |
| Q9 | Recorrer en un teléfono (o DevTools en 375 px) | Sin desbordes horizontales; botones de al menos 44 px. |
| Q10 | DevTools → Network → Offline, luego elegir un caso nuevo | La revelación muestra error con «Reintentar»; no inventa resultado. |
| Q11 | Con «reducir movimiento» activado en el sistema | Sin animaciones entre pasos. |

## Puerta de propiedad

```bash
git diff --name-only origin/sync_main...HEAD
```
Solo debe listar `specs/008-detective-mode/**`, `web/src/features/guide/**` y `web/src/content/index.ts`.
