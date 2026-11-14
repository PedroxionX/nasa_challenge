# Fixtures de prueba — datos SINTÉTICOS

Copia fija de los archivos de ejemplo que 002 generó para el contrato revisado el 2026-11-14 (`schema_version: 1`). **Solo para pruebas**: no se sirven en el sitio (Vite no publica `src/`). Los datos que ve la aplicación están en `web/public/data/trends/` y son de 003.

Las pruebas no deben leer `web/public/data/trends/`, porque 003 la sustituye por datos reales cuyas cifras cambian. Usan estos fixtures con el ayudante [`../testing/fixtures.ts`](../testing/fixtures.ts):

```ts
import { fixtureFetch } from '../../lib/testing/fixtures'
vi.stubGlobal('fetch', vi.fn(fixtureFetch()))
```

**No son observaciones de la NASA.** Las cifras salen de una tendencia lineal más ruido con semilla fija. Cada serie lleva `provenance.is_synthetic: true`.

| Variable | Periodo | Ventanas | Mapa |
|---|---|---|---|
| `air_temperature` | 1980–2025 | 703 | `°C/década` |
| `precipitation` | 2001–2025 | 136 | `%/década` (relative_change) |

| Archivo | Caso que ilustra en el periodo completo |
|---|---|
| `series/air_temperature/MX-BCN.json` | `increasing` |
| `series/air_temperature/MX-SON.json` | `inconclusive` |
| `series/air_temperature/MX-CMX.json` | `insufficient` (años excluidos, región pequeña) |
| `series/air_temperature/US-TX.json` | `invalid` (escalón en 2001) |
| `series/precipitation/MX-BCN.json` | `decreasing` (con columnas de %) |
| `series/precipitation/MX-SON.json` | `inconclusive` |
| cualquier otra región | sin archivo → el ayudante responde como Vite (200 con `index.html`) → `DataError` `not_found` |
| `map/{variable}.json` | cambio por década de las 84 regiones para todas las ventanas de su periodo |

Cambiar estos archivos rompe pruebas de varios equipos: se pide a 002.
