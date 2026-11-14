Actúa como responsable técnico de producto con experiencia en aplicaciones geoespaciales, datos de observación terrestre, estadística de series temporales, diseño de interfaces y experiencia de usuario, y planificación de proyectos para hackatones.

Quiero que desarrolles un plan de proyecto concreto y ejecutable para este repositorio, basado en `README.md`, los prototipos existentes y la documentación de sus recursos. Responde en español. Utiliza **GitHub Spec Kit** para especificación y planificación, y **Impeccable**, si está disponible, para evaluar y diseñar la experiencia de usuario.

El alcance de esta sesión es investigar y planificar. Puedes crear o actualizar la configuración local de estas herramientas y sus documentos de planificación; conserva el código de la aplicación y los cambios existentes. La implementación del producto corresponde a una sesión posterior. Si el entorno solo permite conversar, entrega los documentos como borradores y explica qué pasos no pudieron ejecutarse.

Antes de proponer la solución, lee los archivos y abre las fuentes. No sustituyas la investigación por conocimientos de memoria, fragmentos del buscador o una arquitectura genérica. Distingue hechos comprobados, recomendaciones, supuestos y cuestiones pendientes.

**Método de trabajo: GitHub Spec Kit**

Consulta el [repositorio oficial](https://github.com/github/spec-kit), la [guía para proyectos existentes](https://github.github.io/spec-kit/how-to/existing-projects.html), la [integración con Claude Code](https://github.github.io/spec-kit/integrations/claude.html) y el [flujo de especificación](https://github.github.io/spec-kit/quickstart.html). Spec Kit proporciona un proceso y artefactos mediante skills; debes seguirlos, no limitarte a mencionar su nombre.

Comprueba qué versión e integración existen en el entorno y lee sus instrucciones locales. En la integración de Claude consultada, las skills se ubican en `.claude/skills/speckit-<command>/SKILL.md` y se invocan con `/speckit-<command>`. Versiones anteriores pueden exponer otra sintaxis; utiliza la que realmente esté instalada. Si falta la integración, consulta el procedimiento oficial para incorporarla al proyecto existente, conservando personalizaciones y evitando sobrescrituras. Si no puedes instalarla o invocarla, entrega un borrador compatible e identifica la limitación; no afirmes haber ejecutado Spec Kit.

Después de revisar el repositorio y las fuentes, sigue esta secuencia, comprobando la salida de cada etapa:

| Etapa | Aplicación a este proyecto |
| --- | --- |
| `/speckit-constitution` | Principios de rigor científico, procedencia, usabilidad, impacto visual y rendimiento. Reutiliza una constitución existente si corresponde. |
| `/speckit-specify` | Resultado esperado, historias de usuario, alcance del MVP y aceptación. Describe necesidades antes de decidir la arquitectura. |
| `/speckit-clarify` | Resuelve ambigüedades relevantes sobre producto, datos y compatibilidad. Aprovecha el contexto ya proporcionado. |
| `/speckit-plan` | Selección tecnológica y científica, decisiones de reutilización y diseño de la interfaz. |
| `/speckit-checklist` | Revisión de la claridad y cobertura de requisitos científicos y de experiencia de usuario. |
| `/speckit-tasks` | Trabajo ordenado por dependencias, con prioridades, esfuerzo y resultados verificables. |
| `/speckit-analyze` | Consistencia entre requisitos, plan y tareas; registra hallazgos y vuelve a la etapa correspondiente para corregirlos. |

Estas invocaciones pertenecen al agente, no al terminal. En esta sesión termina con el plan, tareas y análisis de consistencia: no ejecutes `/speckit-implement` ni declares una implementación validada. Si una decisión esencial permanece abierta, identifica el artefacto afectado y su estado provisional; no marques las revisiones como superadas por defecto.

Aplica el proceso al siguiente incremento acotado sobre el prototipo. Entrega además una hoja de ruta general, pero evita crear una especificación retrospectiva exhaustiva de todo el repositorio. Mantén trazabilidad entre requisito, historia, tarea y validación.

Usa las rutas y plantillas resueltas por la instalación para la constitución y la funcionalidad activa. Materializa los documentos pertinentes: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md` y `checklists/`. En `quickstart.md`, distingue los pasos que funcionan hoy de los previstos para el producto futuro. Enlaza los artefactos desde la respuesta final y evita duplicar decisiones en documentos contradictorios. [Referencia de planificación](https://github.com/github/spec-kit/blob/main/templates/commands/plan.md).

**Diseño con Impeccable y revisión específica de Three.js**

Lee el [repositorio de Impeccable](https://github.com/pbakaus/impeccable), su [skill para Claude](https://github.com/pbakaus/impeccable/blob/main/.claude/skills/impeccable/SKILL.md) y las referencias necesarias para el trabajo. Comprueba disponibilidad y sintaxis antes de invocarla; no supongas que leer documentación equivale a tenerla instalada.

Impeccable contempla aplicaciones y dashboards. Usa su enfoque **Operate** para selección, controles y análisis, y **Read** para explicaciones científicas. Una experiencia visual memorable puede apoyarse en el globo sin obligar a recorrer una presentación antes de investigar. [Guía Operate](https://github.com/pbakaus/impeccable/blob/main/.claude/skills/impeccable/reference/operate.md).

Durante esta planificación, utiliza las capacidades disponibles de `critique` y `audit` para evaluar el prototipo y `shape` para definir el flujo propuesto. Lee primero las referencias de cada comando. Si generas `PRODUCT.md` o `DESIGN.md`, distingue contexto confirmado, diseño existente y propuesta pendiente de validar; enlázalos desde Spec Kit. Usa el contexto del README y esta petición para evitar preguntas repetidas. Los cambios de `adapt`, `optimize`, `harden`, `animate` o `polish` deben convertirse en tareas futuras, no ejecutarse sobre la aplicación en esta sesión. [Planificación de UX con shape](https://github.com/pbakaus/impeccable/blob/main/.claude/skills/impeccable/reference/shape.md).

Si Impeccable no puede ejecutarse, aplica sus guías accesibles e identifica esa diferencia. Solo propone otra skill si cubre una carencia concreta: verifica su repositorio, instrucciones y compatibilidad con el stack; no inventes una skill especializada ni añadas herramientas por popularidad.

El análisis del DOM y CSS no basta para validar lo que sucede dentro del canvas. Complementa la revisión con la [API de react-globe.gl](https://github.com/vasturiano/react-globe.gl), la [guía de tamaño y resolución de Three.js](https://threejs.org/manual/pages/responsive.html) y la [gestión de recursos gráficos](https://threejs.org/manual/pages/how-to-dispose-of-objects.html). Evalúa:

- Responsabilidades entre React, `react-globe.gl` y la escena Three.js; sincronización de selección, cámara, panel y datos. Mantén el stack como candidato principal; justifica cualquier migración, incluida React Three Fiber.
- Calidad y coste de texturas, tamaño del canvas, resolución interna y presupuesto de renderizado en móvil. Propón métricas y dispositivos de referencia; no prometas FPS sin medir.
- Ciclo de animación, pausa cuando no aporta valor, movimiento reducido y liberación de geometrías, materiales, texturas y listeners según quién sea su propietario.
- Selección táctil y por teclado mediante controles HTML, posición de tooltips, interacción entre overlays y canvas, carga fallida y alternativa si WebGL no está disponible.
- Separación entre efectos decorativos y codificación científica: la luz, las nubes, el relieve y el resaltado no deben impedir interpretar las regiones y sus tendencias.

**Contexto y objetivo del producto**

El README describe el reto de NASA Space Apps 2026 sobre detección de tendencias en el sistema terrestre. La herramienta debe permitir:

1. Descubrir y seleccionar variables de misiones o modelos de ciencias de la Tierra.
2. Elegir una región y obtener datos correspondientes a esa región.
3. Generar y visualizar una serie temporal con un periodo suficiente para analizarla.
4. Estimar la dirección y magnitud del cambio y evaluar su significancia estadística.

Debe responder de forma comprensible: qué cambia, dónde, cuánto y con qué evidencia estadística. El público previsto incluye estudiantes y personas con conocimientos científicos básicos.

Una prioridad explícita del equipo es tener un frontend llamativo y fácil de utilizar. La calidad visual y la facilidad de uso deben formar parte del MVP, sus criterios de aceptación y su presupuesto de trabajo desde el inicio.

La visualización y el análisis estadístico son requisitos centrales. El uso de IA, un cuestionario de descubrimiento, análisis no lineales y la integración de todas las fuentes son decisiones opcionales. No conviertas las sugerencias del README en requisitos obligatorios ni interpretes la significancia como una prueba de causalidad.

**Primero: inspecciona el proyecto existente**

Lee `README.md`, `web/README.md`, `web/package.json`, `web/src/App.tsx`, `web/src/components/EarthGlobe.tsx`, `web/src/components/RegionPanel.tsx`, `web/src/index.css` y `web/src/lib/geo.ts`. Revisa también los recursos locales de `web/public/` que sean pertinentes para evaluar el prototipo. Respeta las instrucciones locales aplicables. Si algún archivo no está disponible, indícalo.

En la revisión previa se encontró un frontend React, TypeScript y Vite con un globo basado en `react-globe.gl` y Three.js, selección de estados de México y Estados Unidos y recursos geográficos locales. El panel contiene espacios pendientes para series, cambio por década, significancia y “años para ser significativo”. Verifica este estado: las etiquetas del panel no demuestran que exista un motor estadístico.

Limita la evaluación de prototipos al globo de `sync_main` y al laboratorio de `practice/trendlens-lab`, si está disponible. Revisa el código fuente, las pruebas y la documentación científica de ese laboratorio; verifica sus afirmaciones contra el código. Puedes usar `git show` y `git ls-tree` para comparar sin cambiar de rama ni mezclar automáticamente implementaciones. No amplíes la revisión a otras ramas o variantes del laboratorio.

Revisa especialmente adquisición de datos, procesamiento, motor estadístico, contratos, explicaciones, exportación y pruebas del laboratorio. Determina qué puede extraerse para servir al frontend React y qué depende de Streamlit. Si `practice-lab/` en la rama activa solo conserva cachés, entornos o `.pyc`, busca el código en `practice/trendlens-lab`; esos archivos locales no equivalen al prototipo completo. No leas credenciales ni recorras dependencias instaladas. Explica qué existe, qué falta y qué conviene reutilizar.

**Evalúa críticamente el prototipo antes de elegir cómo continuar**

Responde explícitamente: ¿el prototipo que ya construimos es la mejor base para seguir desarrollando?, ¿qué problemas resuelve bien?, ¿qué nos limita?, ¿qué deberíamos extraer y reutilizar si cambiamos de enfoque?

Si tu entorno dispone de navegador y permite ejecutar el proyecto, utiliza sus scripts existentes para abrir el prototipo e inspeccionar el flujo real en escritorio y móvil. Recorre selección de región, navegación, controles del globo, apertura y cierre del panel, teclado y redimensionado. Documenta observaciones y capturas si están disponibles. Si no puedes ejecutarlo, distingue la revisión del código de una evaluación visual o de usabilidad; no afirmes haber probado interacciones.

Compara tres rutas: evolucionar la estructura actual, refactorizarla conservando sus componentes útiles, o replantear la interfaz reutilizando las piezas que aporten valor. Evalúa ajuste al reto, impacto visual, facilidad de uso, integración de datos, rendimiento, accesibilidad, esfuerzo y riesgo para la demo. Elige una ruta y explica qué evidencia podría hacerte cambiar la recomendación. Fundamenta cualquier propuesta de reescritura en problemas concretos.

Entrega un inventario por archivo o componente con decisión **conservar / adaptar / reemplazar / posponer**, motivo, rama de origen, dependencias y esfuerzo aproximado. Considera al menos el globo y su API de cámara, selección de regiones, `regionColor`, GeoJSON e identificadores, texturas, estilos, panel y los módulos reutilizables del laboratorio. Explica cómo se conectarán las piezas elegidas al producto final.

**Diseña un frontend atractivo y comprensible**

Propón una dirección visual concreta y viable para este producto: composición, jerarquía, tipografía, colores, mapas, gráficas, tarjetas de resultados, animaciones y lenguaje de los controles. La base actual incluye un globo con texturas, atmósfera y nubes, junto con paneles oscuros translúcidos; evalúa qué aporta esa identidad y qué necesita cambiar para facilitar la investigación.

Decide qué papel debe tener el globo 3D: navegación principal, exploración opcional o presentación inicial. Compara su utilidad con un mapa 2D o un buscador/listado de regiones, incluyendo el coste de mantener varias vistas. No impongas una sustitución ni una segunda visualización sin justificarla. El usuario debe poder encontrar una región y completar el análisis sin dominar gestos 3D.

Presenta esquemas de las pantallas principales en escritorio y móvil, con ubicación de controles y resultados. Define una acción inicial evidente, ejemplos guiados, selección de variable y periodo, explicación breve del resultado y acceso progresivo a detalles técnicos. Elige el orden región/variable que mejor funcione; justifícalo. Incluye textos de ejemplo para botones, ayudas y estados vacíos.

Revisa posibles conflictos entre el panel, la barra de controles y el mapa en pantallas pequeñas; legibilidad sobre texturas; navegación por teclado; foco visible; uso táctil; movimiento reducido; alternativas cuando WebGL no esté disponible; y coste de texturas y animaciones. Distingue problemas observados de aspectos pendientes de comprobar. Los colores del mapa necesitan leyendas y deben diferenciar tendencia, selección y falta de datos sin depender solo del color.

Define cómo evaluarás la facilidad de uso con tareas concretas: encontrar una región, escoger una variable, cambiar el periodo e interpretar el resultado. Propón una prueba breve con personas del público objetivo y criterios medibles de éxito, tiempo, errores y comprensión. Presenta esos umbrales como objetivos por validar, no como resultados ya obtenidos. Reserva tareas y tiempo para diseño, implementación responsive y validación con usuarios.

**Investigación obligatoria de recursos**

Abre los 13 enlaces del README. Lee las secciones útiles para el proyecto y sigue sus enlaces a documentación técnica. Para las fuentes que recomiendes integrar, revisa autenticación, catálogo, selección espacial y temporal, formato de salida, procesamiento y límites documentados. Una página de presentación no basta para dar por verificada una API.

| Recurso del README | Enlace | Qué debes comprobar |
| --- | --- | --- |
| Giovanni | https://giovanni.gsfc.nasa.gov/giovanni/ | Variables, series promediadas por área, exportación y servicios vigentes. |
| Hydrology Time Series | https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series | Productos disponibles, extracción puntual, formatos y acceso programático. |
| AppEEARS | https://appeears.earthdatacloud.nasa.gov/ | Catálogo, extracción por punto o área, calidad de datos y procesamiento por tareas. |
| NOAA Climate Data Online | https://www.ncei.noaa.gov/cdo-web/ | Datos de estaciones, cobertura, API, token y restricciones. |
| Artículo SeaWiFS | https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf | Métodos, resultados y limitaciones; qué puede adaptarse al producto. |
| KNMI Climate Explorer | https://climexp.knmi.nl/ | Series, anomalías y tendencias; utilidad como referencia o herramienta de validación. |
| Artículo sobre pruebas de tendencia | https://medium.com/@snp.kriss/statistical-test-methods-to-detect-trends-in-time-series-data-b361a0ec530b | Métodos discutidos; contrastar sus afirmaciones con fuentes primarias. |
| Guía de significancia | https://www.statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance | Conceptos pedagógicos; contrastar definiciones y fórmulas con fuentes primarias. |
| RADARSAT Constellation Mission | https://donnees-data.asc-csa.gc.ca/en/dataset/rcm | Acceso real, resolución, cobertura, restricciones y esfuerzo de procesamiento. |
| GEO.ca | https://geo.ca/ | Catálogos o capas pertinentes; no asumir una API universal de series temporales. |
| SWOT | https://www.asc-csa.gc.ca/eng/satellites/swot/ | Variables, historia disponible y adecuación al periodo de análisis. |
| Monitoreo de ecosistemas desde el espacio | https://www.asc-csa.gc.ca/eng/satellites/everyday-lives/monitoring-and-protecting-our-ecosystems-from-space.asp | Casos de uso y contexto científico; revisar vigencia. |
| Tutorial SAR de CSA | https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial | Qué enseña realmente y si contribuye al MVP. |

Consulta también estas páginas técnicas y científicas:

- [Manual de Giovanni](https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html).
- [Migración de GES DISC a Earthdata y Earthdata Cloud](https://github.com/nasa/gesdisc-tutorials/blob/main/user-guidance/GES_DISC_Migration_to_Earthdata_Website_and_Earthdata_Cloud.md).
- [Documentación de la API de AppEEARS](https://appeears.earthdatacloud.nasa.gov/api/).
- [Documentación de la API v2 de NOAA CDO](https://www.ncei.noaa.gov/cdo-web/webservices/v2).
- [Entrada alternativa de KNMI Climate Explorer](https://climexp.knmi.nl/start.cgi).
- [Condiciones de acceso a RCM, CSA](https://www.asc-csa.gc.ca/eng/satellites/radarsat/access-to-data/about.asp).
- [Documentación de `scipy.stats.linregress`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html).
- [Hirsch y Slack: pruebas de tendencia estacionales con dependencia serial](https://pubs.usgs.gov/publication/70012890).
- [Weatherhead et al. (1998): factores que afectan la detección de tendencias](https://doi.org/10.1029/98JD00995), si evalúas la función de años necesarios para detectar una tendencia.

Si una fuente falla, requiere JavaScript, autenticación o tiene contenido inaccesible, registra el problema y busca una alternativa oficial. No digas que leíste una página completa si solo accediste a su resumen. Si careces de navegación, declara esa limitación y entrega un plan provisional con las verificaciones pendientes identificadas.

Por cada recurso entrega una fila breve con: URL consultada, fecha de consulta, estado de acceso, hallazgo útil, limitación y decisión de uso —integración, validación, contexto o fuera del MVP—. No es necesario integrar todos los recursos. Cita las afirmaciones técnicas junto a la decisión que sustentan; utiliza los artículos divulgativos como orientación y fuentes primarias para justificar métodos.

**Hallazgos de la revisión previa que debes revalidar**

Estos hallazgos se revisaron el 14 de noviembre de 2026. Sirven como punto de partida; no sustituyen tu lectura ni prueban que se haya ejecutado una descarga autenticada:

- El manual de Giovanni describe series calculadas mediante promedios espaciales para cada instante y exclusión de valores de relleno. Debes comprobar si la selección disponible representa el polígono de un estado, una caja geográfica o un punto. [Manual](https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html).
- NASA documentó la migración de GES DISC a Earthdata Cloud y fechas de retiro de accesos y servicios locales durante 2026. Verifica los servicios vigentes y evita basar el plan en ejemplos antiguos de descarga u OPeNDAP. [Aviso de migración](https://github.com/nasa/gesdisc-tutorials/blob/main/user-guidance/GES_DISC_Migration_to_Earthdata_Website_and_Earthdata_Cloud.md).
- AppEEARS documenta autenticación mediante Earthdata Login, tokens y tareas con estados de procesamiento. Si lo eliges, contempla espera, recuperación de resultados y renovación de credenciales. [API](https://appeears.earthdatacloud.nasa.gov/api/).
- NOAA CDO documenta un token obligatorio y límites de cinco solicitudes por segundo y 10 000 al día por token. Son límites documentados que debes revalidar. [API v2](https://www.ncei.noaa.gov/cdo-web/webservices/v2).
- La entrada de KNMI ofrece análisis de series y tendencias, pero también informa de verificación humana. No presupongas que su interfaz web sea una API adecuada para automatizar. [KNMI](https://climexp.knmi.nl/start.cgi).
- El enlace original del catálogo RCM devolvió un error durante la revisión. La documentación alternativa de CSA explica que el acceso depende del perfil de usuario y requiere registro en EODMS; no todos los productos son públicos. [CSA](https://www.asc-csa.gc.ca/eng/satellites/radarsat/access-to-data/about.asp).
- La ficha de SWOT indica lanzamiento en diciembre de 2022. Evalúa la duración efectiva de cada producto antes de proponer tendencias de largo plazo. [Misión SWOT](https://www.asc-csa.gc.ca/eng/satellites/swot/).
- El tutorial SAR presenta ejercicios de visualización de imágenes y archivos geográficos en Python y QGIS. Su existencia no demuestra que aporte directamente el flujo de series y tendencias requerido. [Tutorial](https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial).

**Decisiones que el plan debe resolver**

Propón un MVP pequeño que complete el flujo de principio a fin. Considera inicialmente una o dos variables, pocas regiones de demostración y datos diarios o mensuales; ajusta este alcance si hay una razón concreta. Prioriza una fuente NASA con historia y calidad adecuadas y una alternativa de acceso si falla la integración principal.

Compara brevemente las opciones y elige una ruta recomendada. Para cada dataset elegido identifica producto y versión, variable exacta, unidades, cobertura, resolución, indicadores de calidad, método de acceso y referencia oficial. No inventes identificadores ni periodos: marca lo pendiente y define cómo validarlo.

Distingue temperatura del aire y de superficie, precipitación acumulada y tasa de precipitación, observaciones y reanálisis. Para el mapa, distingue el promedio de una región de un valor en su centroide. Si propones una aproximación espacial, explica sus efectos y cómo se comunicará en la interfaz.

Compara acceso en vivo, procesamiento previo y caché. La demo debe contar con una alternativa basada en datos reales descargados y con procedencia registrada. Los datos sintéticos sirven para pruebas y demostraciones explícitamente etiquetadas; no deben presentarse como observaciones de NASA.

No asumas tamaño del equipo, presupuesto, fecha de entrega, cuentas disponibles ni infraestructura. Cuando falte información no bloqueante, declara supuestos ajustables y sigue adelante. Si una respuesta es imprescindible para cerrar una etapa de Spec Kit o la dirección visual, reúne solo las preguntas necesarias y avanza con lo independiente; conserva lo restante como provisional. Puedes usar como escenario ilustrativo un equipo de tres personas y un hackatón de 48 horas, separándolo de una evolución posterior. No lo presentes como una condición confirmada del usuario o del evento.

**Requisitos de rigor científico**

- Define el preprocesamiento: fechas y calendarios, unidades, valores de relleno, indicadores de calidad, datos faltantes, valores atípicos, agregación temporal y ponderación espacial cuando corresponda. Conserva la procedencia y las transformaciones.
- Elige y justifica un método principal viable para el MVP. Compara regresión lineal con prueba de pendiente y Mann–Kendall con pendiente de Sen, sin exigir implementar todos los métodos.
- Explica cómo tratarás estacionalidad y autocorrelación, qué diagnósticos usarás y cuándo los supuestos impiden presentar una inferencia fiable. No trates observaciones mensuales correlacionadas como independientes por defecto.
- Define qué significan pendiente, unidades por año o década, intervalo de confianza, valor p y nivel alfa. Relaciona cada resultado con su método; no mezcles estimadores e intervalos sin justificación.
- Distingue una prueba sobre la pendiente de una comparación de medias. Un test de raíz unitaria tampoco responde por sí mismo si existe una tendencia determinista significativa.
- Diferencia “evidencia de aumento”, “evidencia de disminución”, “evidencia insuficiente” y “datos insuficientes o análisis no válido”. Un resultado no significativo no demuestra ausencia de cambio.
- Define criterios defendibles de cobertura y duración de la serie; no fijes un número universal de años como garantía de significancia.
- Si se exploran muchas regiones o variables, explica cómo limitarás o tratarás las comparaciones múltiples y la selección oportunista de resultados. Puede quedar fuera del MVP el análisis masivo.
- Revisa críticamente “años para ser significativo”, previsto en el panel. No es un requisito del README. Si se conserva, exige sustento en Weatherhead, supuestos sobre tendencia, ruido y autocorrelación, potencia, incertidumbre y condiciones de invalidez. Evalúa posponerlo; no prometas una fecha en que la tendencia será significativa.
- Las explicaciones deben distinguir significancia estadística, magnitud del cambio, relevancia ambiental y causalidad. Si propones IA, que explique resultados calculados y cite procedencia; el motor estadístico debe producir los números.

**Entregables del plan**

Distribuye el detalle en los artefactos de Spec Kit y presenta una síntesis con enlaces en estas diez partes. Usa tablas cuando faciliten comparar opciones o ejecutar tareas y evita repetir información:

1. **Diagnóstico y trazabilidad.** Resume el problema y el estado del repositorio. Identifica herramientas, versiones, skills realmente ejecutadas y guías solo consultadas. Mapea cada objetivo del README a una funcionalidad y un criterio de aceptación. Incluye el registro de fuentes consultadas y las limitaciones de la investigación.
2. **Veredicto sobre el prototipo.** Compara las tres rutas de continuidad, recomienda una e incluye el inventario de piezas reutilizables. Señala fortalezas, limitaciones y cambios prioritarios con evidencia de archivos o de interacciones observadas.
3. **MVP y experiencia de uso.** Define usuario, propuesta de valor, recorrido desde la selección de región y variable hasta la interpretación, prioridades y exclusiones. Propón dos casos de demostración sin inventar sus resultados.
4. **Propuesta visual y de usabilidad.** Presenta los hallazgos de Impeccable o de la revisión basada en sus guías, la dirección visual, el papel del globo, esquemas de escritorio y móvil, componentes, jerarquía, microinteracciones y textos de ejemplo. Incluye estados de carga, falta de datos y errores, accesibilidad, procedencia y validación con usuarios. Distingue revisión de interfaz y revisión de la escena 3D. Concreta cómo conseguiremos un frontend llamativo y fácil de utilizar.
5. **Selección y obtención de datos.** Compara fuentes candidatas, elige productos concretos y describe la extracción y transformación. Identifica las primeras verificaciones para demostrar acceso y obtener una serie real antes de comprometer la integración definitiva. Incluye alternativa de demo, atribución y restricciones documentadas.
6. **Arquitectura y contratos.** Aplica la decisión sobre el prototipo y describe la transición desde el estado actual. Justifica dónde se adquieren datos y dónde se calculan las estadísticas. Compara un pipeline previo con archivos servidos al frontend y un backend para consultas dinámicas; elige la opción adecuada al alcance. Incluye un diagrama Mermaid, estructura de módulos propuesta y contrato de datos ilustrativo —identificadores de región y variable, fechas, valores, unidades, calidad, procedencia, método, pendiente, intervalo, valor p y estado del análisis—. Mantén credenciales fuera del navegador. No añadas bases de datos, colas o servicios sin necesidad concreta.
7. **Metodología y validación.** Describe el algoritmo de principio a fin, sus supuestos y la interpretación para el usuario. Propón pruebas científicas relevantes: series con tendencia conocida, ausencia de tendencia, estacionalidad, autocorrelación, huecos y casos degenerados. Incluye comparación con una implementación de referencia y validación de al menos una serie real; evita pruebas que solo reproduzcan el propio código.
8. **Backlog y cronograma.** Divide el trabajo en tareas con ID, prioridad, responsable por rol, esfuerzo estimado en horas, dependencias, entregable y criterio de aceptación verificable. Expón la ruta crítica de datos y análisis e incluye desde el inicio el trabajo de diseño y usabilidad que pueda avanzar de forma independiente. Reserva tiempo explícito para integración, rendimiento, móvil y pruebas de la demo. Separa MVP y evolución posterior, distingue esfuerzo de tiempo calendario e incluye margen para fallos y qué recortar primero.
9. **Riesgos y decisiones pendientes.** Prioriza acceso y migración de servicios, cobertura insuficiente, costes de cómputo, tiempos de procesamiento, fallos de red, geometrías, rendimiento del frontend, dificultades de uso y conclusiones estadísticas engañosas. Para cada riesgo indica mitigación, señal para activar una alternativa y efecto sobre el alcance. Marca estimaciones de rendimiento o coste como objetivos o supuestos hasta medirlas.
10. **Definición de terminado y siguiente paso.** Define qué evidencia demostrará que se cumplen los cuatro objetivos, la calidad visual y los criterios de facilidad de uso; qué incluirá la demo y cómo reproducirla. Reporta el resultado de consistencia de Spec Kit y los puntos abiertos. Termina con las primeras cinco acciones concretas de implementación en orden y como máximo cinco preguntas pendientes que realmente cambien el plan. La entrega de documentos no equivale a completar o validar el producto.

Quiero decisiones justificadas, prioridades y trabajo estimable. Cuando algo no se haya verificado, dilo y propón la comprobación necesaria. El plan debe permitir empezar a trabajar sobre este repositorio sin tener que rehacer la investigación básica ni confundir una interfaz preparada con una funcionalidad terminada.
