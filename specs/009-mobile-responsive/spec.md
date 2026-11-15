# Feature Specification: Uso de Trend Detective en móviles

**Feature Branch**: `009-mobile-responsive`
**Created**: 2026-11-15
**Status**: Especificado; aceptación del usuario pendiente.
**Input**: «Modificar el código para que sea responsive en dispositivos móviles; primero crear la rama y leer el proyecto; basarse en Spec Kit».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Empezar una investigación en el teléfono (Priority: P1)

La persona encuentra el buscador y el selector de variable y puede abrir cualquiera de los dos ejemplos, incluso en una pantalla pequeña.

**Why this priority**: La primera visita debe dar acceso al análisis sin contenido recortado.
**Independent Test**: Abrir la aplicación a 320×568 y 390×844, recorrer la bienvenida y elegir un ejemplo mediante tacto y mediante teclado.

**Acceptance Scenarios**:

1. **Given** una primera visita en móvil, **When** la persona desplaza la bienvenida, **Then** llega a su título, los dos ejemplos y el aviso científico sin zonas inaccesibles.
2. **Given** el buscador abierto, **When** se busca un estado, **Then** las opciones se pueden recorrer y elegir sin desplazar horizontalmente la página.

### User Story 2 - Leer un análisis y una comparación (Priority: P1)

La persona lee el resultado, cambia el periodo y compara dos regiones en un panel que cabe en la pantalla; las tablas anchas tienen desplazamiento propio.

**Why this priority**: Es el recorrido principal del producto.
**Independent Test**: Abrir Baja California y comparar con Texas a 320 px, cambiar el inicio del periodo y consultar cifras y tablas.

**Acceptance Scenarios**:

1. **Given** un resultado, **When** se amplía o reduce su panel, **Then** siempre se puede volver a cambiar su tamaño y recorrer todo el contenido.
2. **Given** una comparación con tabla ancha, **When** se desplaza la tabla, **Then** solo la tabla se desplaza horizontalmente y el resultado mantiene el ancho del panel.

### User Story 3 - Cambiar la orientación y consultar fuentes (Priority: P2)

La persona gira el teléfono o abre métodos, definiciones y la tabla de regiones, manteniendo disponibles los controles y el resultado elegido.

**Why this priority**: Las pantallas de poca altura requieren otra distribución.
**Independent Test**: Pasar entre 390×844 y 844×390 con una región abierta; abrir y cerrar los diálogos, y repetir sin globo 3D.

**Acceptance Scenarios**:

1. **Given** una región seleccionada, **When** se gira el teléfono, **Then** región, variable, comparación y periodo se conservan y el panel sigue siendo recorrible.
2. **Given** métodos o tabla abiertos, **When** se recorre su contenido, **Then** se puede cerrar el diálogo sin tener que volver al principio.
3. **Given** un navegador sin gráficos 3D, **When** se abre la primera visita, **Then** la bienvenida y la lista de regiones se recorren sin taparse.

### Edge Cases

- Pantallas de 320 px, poca altura, nombres largos y unidades extensas.
- Cambio de orientación, ampliación del texto, teclado en pantalla y áreas reservadas a la cámara/barra del teléfono.
- Evidencia insuficiente, datos insuficientes, errores recuperables y comparación sin prueba publicada.
- Tabla más ancha que el panel; movimiento reducido; pérdida o ausencia de gráficos 3D.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-M01**: La bienvenida y sus dos ejemplos deben ser alcanzables entre 320 y 1440 px de ancho, con desplazamiento vertical cuando sea necesario.
- **FR-M02**: Buscador, variable y métodos deben caber en la cabecera y mantener objetivos táctiles de al menos 44 px de alto; los campos de entrada móviles deben permitir leer lo escrito sin ampliar manualmente.
- **FR-M03**: En vertical se debe poder ampliar/reducir el panel y recorrerlo completo; en horizontal de al menos 600 px de ancho y hasta 500 px de alto, el panel debe usar la altura disponible junto al globo.
- **FR-M04**: El panel de análisis y comparación debe caber sin desplazamiento horizontal propio; una tabla ancha debe desplazarse dentro de su propio contenedor y ser accesible con teclado.
- **FR-M05**: Métodos, definición de variable y tabla de regiones deben caber en el ancho disponible, ofrecer desplazamiento del contenido y mantener accesible su cierre o control de apertura.
- **FR-M06**: Sin globo 3D, bienvenida y tabla deben seguir siendo legibles y permitir seleccionar cualquier región.
- **FR-M07**: Al girar el dispositivo o cambiar el tamaño del panel se deben conservar selección y periodo, ajustar la zona libre del globo y respetar el movimiento reducido.
- **FR-M08**: Los resultados científicos, su procedencia, los enlaces compartidos y la lectura de las 14 variables se deben conservar; este incremento adapta su presentación.
- **FR-M09**: En teléfono, la bienvenida debe empezar compacta y un estado debe abrirse como resumen. El análisis completo requiere una acción explícita y debe ofrecer un retorno directo al globo, conservando selección y periodo. Las herramientas y mensajes no deben tapar el centro del globo en la vista inicial ni en el resumen.
- **FR-M10**: Al elegir otra región, variable o comparación se debe mostrar el nuevo resultado desde el principio. Tras una selección táctil en el buscador debe liberarse el campo para cerrar el teclado; la selección por teclado debe conservar su foco.

### Key Entities

- **Disposición**: cabecera, escenario y panel; se adapta al espacio disponible.
- **Panel**: estados asomado, medio y completo en vertical; lateral en pantallas anchas o bajas.
- **Contenido desplazable**: bienvenida, cuerpo del panel, diálogo y tabla ancha; cada uno conserva su lectura y controles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-M01**: Inicio, análisis y comparación caben sin desplazamiento horizontal del documento ni del cuerpo del panel a 320×568, 360×640, 390×844, 700×500, 844×390 y 1440×900.
- **SC-M02**: En esos tamaños se alcanzan los dos ejemplos, los controles de consulta, el periodo, el final del resultado y el cierre de los diálogos.
- **SC-M03**: Se completa el recorrido buscar → elegir variable → cambiar periodo → comparar → volver al análisis con tacto simulado y con teclado; las tablas anchas son recorribles por separado.
- **SC-M04**: Cambiar entre vertical y horizontal conserva exactamente los parámetros de selección del enlace; la alternativa sin globo y el movimiento reducido siguen disponibles.
- **SC-M05**: A 320×568, 390×844 y 430×932, tanto al iniciar como al seleccionar un estado debe quedar una franja continua de al menos 180 px de alto disponible para interactuar con el globo, con su centro fuera de las tarjetas y herramientas. El resumen del estado debe ocupar como máximo el 35 % del escenario en esos tamaños.

### Corrección tras revisión de agentes

La revisión visual y funcional solicitada por el usuario detectó que los criterios anteriores de desbordamiento no garantizaban ver el globo. Se añaden FR-M09, FR-M10 y SC-M05; sustituyen la apertura inicial al 60 % descrita en la primera implementación.

## Assumptions

- Se adapta la aplicación web existente en español; no se crea una aplicación nativa ni se cambia su identidad visual.
- Este pedido autoriza un incremento transversal de presentación sobre las rutas de 002/004/005/006/007 ya integradas en `main`; no exige coordinar cambios con sus ramas históricas.
- Datos, estadísticas, nuevas fuentes, exportación, alojamiento y nuevas dependencias de producción quedan fuera del alcance.
- La validación automática de navegador se distingue de la aceptación en teléfonos físicos y de las pruebas con personas: estas últimas requieren registro posterior.

## Clarifications

### Session 2026-11-15

No se detectaron ambigüedades críticas que requieran preguntas. La matriz de tamaños, el alcance transversal y la conservación del diseño actual son supuestos explícitos de este incremento.
