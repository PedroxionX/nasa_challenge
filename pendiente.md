# Relevo de Impeccable · 008-ui-polish

Estado al 2026-11-15. Continuar en la rama `008-ui-polish`.

## Trabajo conservado

- `787e450`: contexto de producto en `PRODUCT.md`.
- `5f3c3cd`: interfaz y pruebas en inglés.
- `33dfdf5`: comparación sin desbordes, Inter, formateador único y magnitudes coherentes entre mapa y panel.
- `31cfde3`: tokens canónicos `--color-*`.
- `40302d7`: componentes compartidos, jerarquía del panel y sistema de interfaz.
- `907beae`: favicon, metadatos, imagen social, README y `DESIGN.md`.
- Este relevo conserva además el ajuste de ancho mínimo táctil de la tabla, la instalación de Impeccable 0.1.24 en `.claude/skills/impeccable/`, sus agentes y las capturas antes/después.

Leer `PRODUCT.md` y `DESIGN.md` antes de modificar la UI. Evidencia: `specs/008-ui-polish/evidence/index.html` (390, 768 y 1440 px).

## Pendiente principal: cerrar la segunda evaluación

- [ ] Recuperar los resultados finales de «Critique A final: revisión de diseño» y «Critique B final: detector y auditoría» desde la sesión anterior de Claude, si siguen disponibles. El chat indica que ambos agentes terminaron, pero **sus informes finales no están guardados en el repositorio**.
- [ ] Si no se recuperan, volver a ejecutar critique/audit sobre la UI actual siguiendo `.claude/skills/impeccable/SKILL.md`. No atribuir resultados nuevos a los agentes anteriores.
- [ ] Guardar los informes finales en `specs/008-ui-polish/reports/`. Las únicas puntuaciones verificables guardadas son las iniciales: **critique 23/40, audit 12/20**, copiadas allí como `critique-baseline.md` y `audit-baseline.md` desde `.impeccable/` (estos últimos archivos se ignoran localmente).
- [ ] Corregir los hallazgos finales y repetir las comprobaciones afectadas. Revisar en particular coherencia entre veredicto y magnitud cuando no hay evidencia, accesibilidad de diálogos/foco/teclado, comparación y tabla en móvil, leyenda, métodos y errores de red. Son puntos de revisión derivados del diagnóstico inicial; no se afirma que sigan fallando.
- [ ] Verificar también a **360 px**: las capturas guardadas empiezan en 390 px. Actualizar evidencia después de cualquier corrección y dejar comparación de puntuaciones inicial/final y hallazgos restantes.
- [ ] Investigar y documentar la reducción de 261 a 254 pruebas si no hay evidencia de la justificación en la sesión anterior; el estado actual pasa 254, pero este relevo no certifica equivalencia de cobertura.

## Comprobaciones de este relevo

En `web/`: `npm test` (**254/254**, 17 archivos), `npm run lint` y `npm run build` pasan. El build avisa de un chunk JS mayor de 500 kB; evaluar carga diferida si la auditoría de rendimiento lo requiere. No se repitió la inspección visual: las capturas son las dejadas por Claude.

## Otros cambios conservados y tareas relacionadas

Había cambios de la feature 007 mezclados en el árbol: documentación de contratos/demo/método, seguimiento de tareas y datos de comparación para diez variables adicionales junto con su índice. Se conservan para entregar el estado completo sin perder trabajo.

Pendiente validar esos datos con `pipeline/.venv/bin/python pipeline/compare_build.py --check`: se intentó en este relevo, pero el entorno falla al importar `numpy` (`ModuleNotFoundError`). Preparar las dependencias del pipeline y repetir antes de dar los datos por validados.

Consultar los pendientes explícitos de `specs/007-region-comparison/tasks.md`: T004 y T014 (360 px), T018 (globo), T019 (móvil/accesibilidad/movimiento reducido) y T021 (`/speckit-converge`). No marcarlos completados por el mero hecho de cerrar Impeccable.

No se ha publicado ni fusionado la rama en main como parte de este relevo.
