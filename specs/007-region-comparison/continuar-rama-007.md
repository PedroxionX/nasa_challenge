# Entrega de la sesión — rama 007

Fecha: 2026-11-14 (America/Tijuana). Rama: `007-region-comparison`.

## Trabajo guardado

- Pipeline `pipeline/compare_build.py`: comparación por pares con el motor estadístico existente, base absoluta o relativa según catálogo, publicación por variable, procesos paralelos y `--check` de las huellas de las series. Incluye pruebas independientes en `pipeline/tests/test_compare_build.py`.
- Datos publicados para las cuatro variables del catálogo: 3 486 pares por variable; 37 ventanas de temperatura, 15 de precipitación y 17 de cada variable GLDAS.
- Interfaz de comparación con segunda región en `vs`, selección del inicio, gráficas y tablas, procedencia, textos de interpretación y estados de carga/error/sin prueba/no comparable.
- Variables leídas del catálogo, textos de respaldo y pruebas con una variable inventada; marcas A/B en el globo y la tabla.
- Especificación, plan y contrato propios de 007. Los cambios de 003 ya estaban integrados en la rama antes de este commit.

## Verificación de esta entrega

- `cd web && npm test`: 17 archivos y 251 pruebas aprobadas.
- `cd web && npm run build`: aprobado; avisa de un bundle de aproximadamente 2,38 MB sin comprimir (675,55 kB gzip).
- `cd web && npm run lint`: aprobado.
- `git diff --check`: sin errores antes de agregar este documento.
- `practice-lab/.venv/bin/python pipeline/compare_build.py --check`: aprobado; las cuatro variables corresponden a las series actuales.
- `merge_outputs.validate_folder` sobre la carpeta publicada con `compare/` presente: 0 problemas. La operación de merge sobre una copia temporal queda pendiente.
- Las pruebas Python no se ejecutaron: ni `python3` ni `practice-lab/.venv/bin/python` tienen `pytest`. No confundir las pruebas incluidas en el commit con pruebas ejecutadas en esta entrega.

## Pendientes para continuar

1. **T007 y T009 — validación Python.** Preparar un entorno con las dependencias y extras `dev` de `pipeline/pyproject.toml`; ejecutar `python -m pytest pipeline/tests/test_compare_build.py` y las pruebas de contrato/merge de 003. Comprobar la publicación con `merge_outputs.py` sobre una copia temporal, para verificar que conserva `compare/`.
2. **T009 / SC-K04 — tiempo de generación.** El tamaño actual es 14 397 222 bytes en 333 JSON; el mayor es `compare/air_temperature/MX-AGU.json`, 150 571 bytes. Cumple los objetivos de tamaño (15 MB y 250 kB por archivo). No hay registro verificable del tiempo total de generación: medirlo al regenerar en una carpeta temporal; las estimaciones de `tasks.md` no acreditan el objetivo de 20 minutos.
3. **T010 — contrato compartido.** Actualizar `specs/001-trend-explorer-mvp/contracts/data-files.md` con el enlace al contrato `007/contracts/compare-files.md`, el parámetro `vs` y las reglas de validación del estado. El contrato propio de 007 está incluido, pero el principal aún no documenta esta extensión.
4. **T018, T019 / SC-K05 — navegador y accesibilidad.** Revisar ambas regiones y encuadre en WebGL y fallback; completar el flujo con teclado a 360 px y 390×844, Escape, foco, anuncios de lector y movimiento reducido. Verificar el requisito de uso sin red una vez cargado; las pruebas de componentes no acreditan estos escenarios de navegador.
5. **T020 — demo.** Hay texto de método en `MethodsSheet.tsx`; falta dejar una frase de comparación en el guion de la demo.
6. **T001 y T021 — coordinación.** No se ha acreditado comunicación con responsables de 002/004/005/006, actualización de la fila 007 en `metodologia.md` ni del índice de reparto, aprobación de la base relativa propuesta en la especificación, o ejecución de `/speckit-converge`. Conciliar las rutas compartidas con lo que entregue el equipo.
7. **Checklist.** Revisar `tasks.md` y marcar cada tarea solo cuando se hayan satisfecho todos sus criterios de aceptación. Sus casillas originales se conservan; no indican que el código esté ausente.

## Reanudación

Leer este documento junto con [tasks.md](tasks.md) y [contracts/compare-files.md](contracts/compare-files.md). Después de cualquier republicación de series de 003, ejecutar `python pipeline/compare_build.py --check`; si hay huellas desfasadas, regenerar las variables indicadas con `--variables` y volver a verificar antes de entregar.
