# T001: paleta y tipografía (especificación 006)

Para: quien lleva 002. Copiar a `web/src/styles/tokens.css`. Este archivo vive en `docs/paleta.md`.

Dirección: **Ocaso** (violeta–ámbar), panel oscuro. Colores medidos con simulación de deuteranopía, protanopía y tritanopía y contraste calculado. Prueba pendiente sobre el globo real (ver al final).

## Escala de tendencia (5 clases, de baja a sube)

| Token | Valor | Clase |
|---|---|---|
| `--color-trend-down-strong` | `#3B2A7A` | Baja mucho |
| `--color-trend-down-weak` | `#8E86D6` | Baja |
| `--color-trend-neutral` | `#E3DED6` | Casi sin cambio |
| `--color-trend-up-weak` | `#F2B84B` | Sube |
| `--color-trend-up-strong` | `#B45309` | Sube mucho |

Distancia de color mínima entre clases vecinas: **ΔE 31** en el peor caso daltónico simulado (referencia: menos de ~20 se confunde).

## Mapa

| Token | Valor |
|---|---|
| `--color-no-data` | trama diagonal `#8A93A0` sobre transparente, siempre con etiqueta «Sin datos» |
| `--color-selection` | contorno `#FFFFFF` de 3 px + elevación (nunca solo color) |
| Relleno de regiones con datos | opacidad **90 %** |
| Borde de región | `#FFFFFF` al 60 %, 1 px |

Reglas para 005 (globo):

- Con opacidad cercana a 60 % los colores se ensucian y se mezclan con el terreno y el océano. Usar 90 %.
- `--color-trend-down-strong` contrasta solo 1,6:1 con el fondo y `--color-trend-up-strong` 3,7:1: el borde claro es obligatorio.
- El color es el cambio estimado, no su significancia (texto de la leyenda en `ux.md` §7).

## Superficies y texto

| Token | Valor | Notas |
|---|---|---|
| `--color-bg` | `#16121F` | Fondo de la aplicación |
| `--color-panel` | `#1F1A2E` | Panel de análisis, **opaco** (sin vidrio) |
| `--color-line` | `#3A3150` | Bordes y divisores |
| `--color-text` | `#E8EDF4` | 14,3:1 sobre el panel |
| `--color-text-muted` | `#A9B4C2` | 8,0:1 sobre el panel; usar también para procedencia y notas |

## Veredictos

Siempre con icono dibujado + palabra; nunca solo color. Contraste sobre el panel:

| Token | Valor | Estado | Contraste |
|---|---|---|---|
| `--color-verdict-up` | `#F2B84B` | Sube con evidencia | 9,4:1 |
| `--color-verdict-down` | `#8E86D6` | Baja con evidencia | 5,2:1 |
| `--color-verdict-insufficient` | `#C4B08A` | Evidencia insuficiente | 8,0:1 |
| `--color-verdict-invalid` | `#8A93A0` | Datos insuficientes / no válido | 5,4:1 |

## Tipografía

- Familia: **Inter**, autoalojada, solo subconjunto latino, pesos 400, 500 y 700, `font-display: swap`.
- Respaldo: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- `font-variant-numeric: tabular-nums` en toda cifra.
- Los archivos de fuente y el `@font-face` los añade 002 (006 no edita `web/public/` ni `web/src/styles/`).

| Token | Tamaño | Peso | Uso |
|---|---|---|---|
| `--text-xs` | 0,75 rem | 400 | Procedencia, notas (color `--color-text-muted`) |
| `--text-sm` | 0,875 rem | 400 | Etiquetas, controles |
| `--text-base` | 1 rem | 400 | Texto de lectura |
| `--text-lg` | 1,125 rem | 500 | Frase en palabras, nombre de región |
| `--text-xl` | 1,5 rem | 700 | Cifra principal (+X,XX °C/década) |

## Bloque listo para `tokens.css`

```css
:root {
  --color-trend-down-strong: #3b2a7a;
  --color-trend-down-weak: #8e86d6;
  --color-trend-neutral: #e3ded6;
  --color-trend-up-weak: #f2b84b;
  --color-trend-up-strong: #b45309;

  --color-no-data: #8a93a0;
  --color-selection: #ffffff;

  --color-bg: #16121f;
  --color-panel: #1f1a2e;
  --color-line: #3a3150;
  --color-text: #e8edf4;
  --color-text-muted: #a9b4c2;

  --color-verdict-up: #f2b84b;
  --color-verdict-down: #8e86d6;
  --color-verdict-insufficient: #c4b08a;
  --color-verdict-invalid: #8a93a0;

  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.5rem;
}
```

## Pendiente de comprobar

- Repetir la prueba de color sobre el globo real cuando 005 tenga el mapa coloreado. La verificación hecha hasta ahora fue sobre una captura del prototipo con otra paleta (opacidad 90 % se leía bien); con Ocaso no se ha probado sobre la textura.
- Las clases «Baja» y «Sube» tienen luminosidad parecida: la dirección debe ir siempre con flecha y palabra, no solo con color.
