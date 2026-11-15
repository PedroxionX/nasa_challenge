# Investigación y auditoría previa

Fecha: 2026-11-15. Base: rama `main`, árbol limpio al empezar; trabajo en `009-mobile-responsive`.

## Contexto revisado

- README raíz y web; metodología, constitución, instalación y skills locales de Spec Kit 1.4.1.dev0.
- Especificaciones de producto 001–007, diseño UX y contratos de archivos, relevos y criterios pendientes.
- Composición, estado URL, carga y tipos; componentes y estilos de búsqueda, análisis, comparación, globo, guía y errores; fuentes y procesamiento del pipeline, catálogo publicado y atribuciones.
- Tests de componentes y geometría como referencia; suite frontend de base ejecutada: 17 archivos, 261 pruebas aprobadas.
- Los JSON generados, GeoJSON, texturas, fixtures y registros de validación se revisan por estructura, metadatos y ejemplos pertinentes; no se presenta esto como lectura manual de cada dato ni como nueva validación científica.

## Hallazgos medidos antes de editar la aplicación

Chrome headless local, datos reales servidos con Vite; mediciones del DOM:

| Caso | Resultado previo | Causa |
|---|---|---|
| Inicio 320×568 | Escenario desde y=165; bienvenida desde y=121, de 431 px de alto | Tarjeta absoluta sin límite de altura en un escenario con overflow hidden. |
| Comparación 320×568 | Cuerpo del panel: 603 px de contenido horizontal para 320 px disponibles | Tamaños mínimos intrínsecos en grids y tablas; cifra con nowrap. |
| Comparación 390×844 | Cuerpo del panel: 603 px para 390 px disponibles | Misma causa. |
| Inicio 844×390 | Bienvenida desde y=−17, fuera del escenario que empieza en y=113 | La altura fija de ventana no alcanza para la tarjeta. |
| Análisis 844×390 | Solo 94 px de altura útil en el cuerpo | Se usa hoja inferior también en horizontal bajo. |

## Decisiones

Durante la validación del cambio de orientación se confirmó otro defecto de composición: al volver de 844×390 a 390×844, el rótulo de Texas quedaba en x=506 px (fuera de los 390 px visibles). `EarthGlobe.syncInsets` reencuadraba solo la región principal. La corrección conserva el encuadre del par cuando existe comparación, usando la función ya disponible `flyPair`.

### D1. Reutilizar el diseño actual

**Decision**: CSS por funcionalidad, conservando paleta Ocaso, globo y controles HTML.
**Rationale**: ya existen altura dinámica, ResizeObserver, movimiento reducido y texturas ligeras; el problema es su composición en poco espacio.
**Alternatives considered**: migrar librería, aplicación nativa o esconder el globo permanentemente: no se necesitan para corregir los fallos observados.

### D2. Disposición lateral también en horizontal bajo

**Decision**: conservar ≥900 px y añadir `(min-width: 600px) and (max-height: 500px)` para panel lateral, con cabecera compacta en ese segundo caso.
**Rationale**: aprovechar la altura del escenario en vez de dividirla de nuevo. CSS y Shell deben compartir la condición para calcular bien los insets.
**Alternatives considered**: detectar dispositivo o fijar una orientación: el espacio disponible describe mejor el problema.

### D3. Desplazamiento contenido

**Decision**: mínimos cero en grids, bienvenida con altura máxima y desplazamiento vertical, tablas en regiones enfocables con desplazamiento propio, cierres de diálogo pegados arriba.
**Rationale**: ocultar overflow global no hace accesibles las cifras recortadas; hay que preservar todo el contenido.
**Alternatives considered**: reducir tipografía o borrar columnas: perjudicarían la lectura científica.

### D4. Verificación de navegador

**Decision**: medir límites, solapes y scroll con Chrome y Playwright local, además de ejecutar pruebas, build y lint existentes.
**Rationale**: jsdom no calcula la disposición CSS. La emulación no prueba teclado virtual de iOS, áreas seguras de un teléfono físico ni rendimiento de su GPU.
**Alternatives considered**: declarar responsive porque hay media queries: insuficiente frente a los defectos medidos.

## Método Spec Kit

Se aplican las instrucciones locales, con resolución de plantillas y scripts Bash disponibles a través de Git para Windows. No hay `extensions.yml` ni hooks registrados. Se reutiliza la constitución. Clarificación: sin dudas críticas; los supuestos están explícitos. El análisis de consistencia se realiza tras generar tareas, antes de implementación. Las skills se siguen desde Codex; no se afirma haber invocado comandos de Claude Code.
