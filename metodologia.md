# Metodología de trabajo

**La IA escribe el código. Tú ejecutas los comandos, pruebas lo que entrega y tomas las decisiones.**

Cada persona tiene una especificación y una rama, y nadie toca archivos de otra. Las decisiones de producto, datos y ciencia ya están tomadas en `specs/001-trend-explorer-mvp/`.

## 1. Quién hace qué

| Especificación | Rama | Qué entrega |
|---|---|---|
| [002 Base e integración](specs/002-foundation/spec.md) | `002-foundation` | Armazón, estado compartido, carga de datos, publicación |
| [003 Pipeline de datos](specs/003-data-pipeline/spec.md) | `003-data-pipeline` | Archivos con series, tendencias y procedencia |
| [004 Búsqueda y panel](specs/004-analysis-panel/spec.md) | `004-analysis-panel` | Buscador, variable, gráfica, resultado y periodo |
| [005 Globo y mapa](specs/005-globe-map/spec.md) | `005-globe-map` | Selección en el globo, mapa coloreado, rendimiento |
| [006 Textos y validación](specs/006-guide-content/spec.md) | `006-guide-content` | Explicaciones, ejemplos, prueba con usuarios, guion |

## 2. Orden de arranque

1. **002 y 003 empiezan ya.** 006 propone la paleta y se la pasa a 002.
2. **002 fusiona la base en `sync_main` y avisa.** Hasta ese aviso, 004, 005 y 006 no crean su rama.
3. **004, 005 y 006 empiezan.** Trabajan con datos de ejemplo.
4. **003 publica los datos reales.** Los demás los reciben al actualizar su rama.
5. **002 fusiona cada rama según llega y publica el sitio.**
6. **Todos:** prueba con cinco personas y recorrido final.

## 3. Tu flujo, paso a paso

### Preparar (una vez)

```bash
git checkout sync_main && git pull
git checkout -b 004-analysis-panel                                    # tu rama
echo '{ "feature_directory": "specs/004-analysis-panel" }' > .specify/feature.json
claude
```

Cambia `004-analysis-panel` por tu especificación. El archivo `.specify/feature.json` es local y le dice a la IA cuál es la tuya.

### Trabajar (dentro de Claude Code, en este orden)

| Paso | Escribes | Qué hace la IA | Qué haces tú |
|---|---|---|---|
| 1 | `/speckit-clarify` | Te hace hasta cinco preguntas sobre lo que no está claro y guarda las respuestas | **Decides**: respondes |
| 2 | `/speckit-analyze` | Revisa que tu especificación, plan y tareas cuadran | Lees el informe; si hay algo crítico, le pides que lo corrija |
| 3 | `/speckit-implement` | Escribe el código de tus tareas, en orden | Esperas; respondes si pregunta |
| 4 | — | — | **Pruebas**: abres la aplicación y compruebas el criterio «Acepta» de cada tarea |
| 5 | Le cuentas lo que falla, con tus palabras | Lo corrige | Vuelves a probar |
| 6 | `/speckit-converge` | Compara el código con la especificación y añade lo que falte como tareas | Si añade tareas, repites desde el paso 3 hasta que diga `Converged` |

Para probar:

```bash
cd web && npm run dev          # interfaz, en http://localhost:5173
cd web && npm run test         # pruebas del frontend
cd pipeline && python -m pytest -q   # solo 003
```

### Entregar

```bash
git fetch && git rebase origin/sync_main
git diff --name-only origin/sync_main...HEAD     # debe listar solo tus rutas
git push -u origin 004-analysis-panel
```

Abre la petición de fusión hacia `sync_main`. La revisa y fusiona quien lleva 002.

## 4. Lo que cambia según tu especificación

| Especificación | Particularidad |
|---|---|
| 002 | Primero `/speckit-implement solo la fase 1`, fusionas y avisas. La fase 2 (integración y publicación) llega cuando los demás entreguen |
| 003 | `/speckit-implement hasta la tarea T005` sin esperar a nadie. La T006 (publicar datos) va después de la fusión de 002 |
| 004 y 005 | Empiezan tras el aviso de 002. Usan el archivo de ejemplo hasta que 003 publique |
| 006 | La paleta (T001) va antes que nada y sin IA: es una decisión vuestra. La prueba con usuarios necesita 004 y 005 ya fusionadas |

## 5. Qué decides tú y qué no

**Tú decides y compruebas:**
- Las respuestas a `/speckit-clarify`.
- Si lo que hizo la IA cumple el criterio «Acepta» de cada tarea. Marcar `[x]` es tu firma, no la de la IA.
- Qué se recorta en tu parte si vais tarde (el orden está en el [índice de reparto](specs/001-trend-explorer-mvp/tasks.md)).

**No decides por tu cuenta** (se pide a quien lleva 002, que lo cambia en `sync_main` y avisa):
- Dependencias nuevas.
- Cambios en el armazón, el estado compartido, la carga de datos o el [contrato de archivos](specs/001-trend-explorer-mvp/contracts/data-files.md).

## 6. Reglas para no pisarse

1. Tu rama edita solo las rutas de «Propiedad de archivos» de tu especificación. Si la IA toca un archivo ajeno, pídele que lo deshaga antes de entregar.
2. Las carpetas de `web/src/features/` no se importan entre sí; solo de `app/`, `lib/` y `content/`.
3. Estilos y pruebas van dentro de tu carpeta.
4. Si te falta algo de otra rama, se trabaja contra el esbozo o el archivo de ejemplo; no se implementa en la tuya.
5. Cada persona edita solo su carpeta de `specs/`.

## 7. Reglas de contenido sin excepción

Están en la [constitución](.specify/memory/constitution.md) y la IA las lee, pero quien prueba eres tú. Rechaza cualquier entrega que:

- calcule estadística en el navegador en vez de leerla de los archivos;
- redacte «evidencia insuficiente» como «no hay cambio», o una tendencia como causa o pronóstico;
- muestre «años para ser significativo»;
- enseñe un resultado sin método, periodo, número de años, unidades, α y procedencia;
- use datos sintéticos sin rotular o meta una credencial en el repositorio;
- dependa solo del color o no funcione con teclado y con tacto.

## 8. Cuándo está terminado

**Tu rama**: `/speckit-converge` dice `Converged`, has comprobado tú cada tarea, las pruebas pasan, solo hay rutas tuyas modificadas y tu parte funciona en móvil y con teclado.

**El producto**: los diez escenarios de [quickstart](specs/001-trend-explorer-mvp/quickstart.md) pasan en el sitio publicado, hay una serie real contrastada con una referencia externa y la prueba con usuarios está registrada.
