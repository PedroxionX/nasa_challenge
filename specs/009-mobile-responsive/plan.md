# Implementation Plan: Uso de Trend Detective en móviles

**Branch**: `009-mobile-responsive` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)
**Input**: `specs/009-mobile-responsive/spec.md`

## Summary

Corregir el espacio disponible y los desbordamientos del frontend existente. Mantener su globo, paleta y controles nativos, usando CSS adaptable, el contrato de insets de Shell y contenedores de tabla independientes. Investigación en [research.md](research.md); aceptación en [quickstart.md](quickstart.md).

## Technical Context

**Language/Version**: TypeScript ~7.0.2 y CSS.
**Primary Dependencies**: React 19.3, Vite 8, react-globe.gl 2.38 y Three 0.187 existentes; sin dependencias nuevas de producción.
**Storage**: JSON estáticos existentes; no se regeneran.
**Testing**: Vitest existente, compilación TypeScript/Vite, oxlint y recorridos de navegador con mediciones reales del DOM. Playwright local como herramienta temporal, sin cambiar package.json ni lockfile.
**Target Platform**: navegadores móviles actuales con y sin WebGL, escritorio; Chrome disponible localmente. Safari y dispositivos físicos: validación manual posterior explícita.
**Project Type**: aplicación web estática, incremento transversal de presentación.
**Performance Goals**: conservar texturas ligeras, pausa en reposo y movimiento reducido; no afirmar FPS sin medir.
**Constraints**: español, controles de 44 px de alto, sin estadística en navegador, sin cambiar URL, datos ni contratos científicos. Las casillas de tareas requieren aceptación humana (`metodologia.md` §5); registrar ejecución automática aparte.
**Scale/Scope**: inicio, búsqueda, globo, análisis, comparación, fuentes y alternativa sin WebGL; 14 variables, 84 regiones.

## Constitution Check

| Principio | Antes de investigación y tras diseño |
|---|---|
| I. Rigor | Se conserva el motor Python y todos los números publicados. |
| II. Procedencia | Se conservan fuente, unidades y avisos; cambios solo de presentación. |
| III. Uso sin 3D | Se incluye búsqueda, teclado, tablas y alternativa sin WebGL en la validación. La prueba con personas sigue pendiente. |
| IV. Lectura | Superficies opacas y desplazamiento explícito; se respeta movimiento reducido. |
| V. Simplicidad | Sin servicios ni dependencias de producción adicionales; resultados medidos, límites declarados. |

Sin violaciones de diseño. No se declara la puerta de demo aprobada mediante esta entrega.

## Project Structure

```text
specs/009-mobile-responsive/
  spec.md, plan.md, research.md, data-model.md, quickstart.md, tasks.md
  checklists/requirements.md
  contracts/responsive-ui.md
web/index.html
web/src/app/Shell.tsx, shell.css
web/src/styles/base.css
web/src/features/query/query.css
web/src/features/analysis/analysis.css
web/src/features/compare/compare.css
web/src/features/globe/RegionTable.tsx, EarthGlobe.tsx, MapLegend.tsx, camera.ts, globe.css
web/src/features/query/RegionSearch.tsx, query.test.tsx
web/src/features/guide/WelcomeCard.tsx
web/src/features/guide/guide.css
```

**Structure Decision**: se mantienen los módulos existentes; estilos de cada funcionalidad en su carpeta. El pedido del usuario habilita estos puntos de contacto de presentación; no se amplía el contrato de datos.

## Fases y diseño

1. Documentar la auditoría previa y ejecutar la suite de base.
2. Bienvenida compacta con introducción desplegable y ejemplos accesibles; cabecera y herramientas en dos filas y una fila respectivamente, preservando objetivos táctiles y áreas seguras.
3. Hoja vertical inicialmente en resumen (máximo 35 % del escenario), con lectura ampliada solo tras acción explícita y regreso directo al globo. Disposición lateral a partir de 600 px de ancho y hasta 500 px de alto. Se miden panel/bienvenida y herramientas para centrar la cámara en la zona libre, conservando ambas regiones al comparar.
4. Corregir mínimos intrínsecos de grids y aislar tablas anchas en contenedores enfocables; permitir cortar unidades y nombres largos.
5. Diálogos recorribles con cierre pegado arriba y alternativa sin WebGL en flujo durante la bienvenida.
6. Verificar la matriz de tamaños, orientación, teclado, tacto simulado, datos reales, estados y regresiones.
7. Tras la revisión solicitada por el usuario, tres agentes independientes auditan aspecto visual, recorridos y disposición/cámara; se registra la evidencia en review-agents.md. Los requisitos de saturación complementan las comprobaciones anteriores de overflow.

## Complexity Tracking

Sin excepciones a la constitución. El trabajo no añade un sistema de diseño ni una librería de interfaz.
