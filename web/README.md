# Trend Detective · Globo

Interfaz del globo 3D para el reto *Earth System Trend Detective* (NASA Space Apps 2026).

## Correr

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # versión de producción en dist/
```

## Qué hay

- `src/components/EarthGlobe.tsx`: globo (react-globe.gl + three.js) con textura Blue Marble, relieve, brillo del océano, nubes, atmósfera y estrellas. Dibuja los estados de México (32) y de Estados Unidos (50 + D.C. + Puerto Rico), y las fronteras del resto del mundo como fondo. Se puede pasar el cursor por encima y hacer clic en un estado.
  - Prop `regionColor(id)`: aquí se pintará el mapa por tendencia cuando haya datos.
  - Métodos `flyTo(view)` y `flyToRegion(id)` con `ref`.
- `src/components/RegionPanel.tsx`: panel lateral del estado seleccionado. Por ahora solo trae los espacios donde irán la serie de tiempo, el cambio por década, la significancia y los años para ser significativo.
- `src/lib/geo.ts`: tipos, carga de GeoJSON y cálculo de la vista de cámara por estado. Para agregar otro país, se añade una entrada en `REGION_SOURCES`.
- `public/textures/`: texturas locales, para que la demo funcione sin internet.
- `public/data/`:
  - `mx-states.geojson` y `us-states.geojson`: propiedades `{id, name}`, con `id` en ISO 3166-2 (`MX-BCN`, `US-CA`) y los nombres de EE. UU. en español.
  - `countries.geojson`: Natural Earth 110m.
  - Ojo: se quitaron anillos degenerados (área cero) en Virginia, Maryland y Corea del Norte. Con esos anillos el globo pinta el polígono sobre toda la esfera. Si cambian algún GeoJSON, revisen esto.
