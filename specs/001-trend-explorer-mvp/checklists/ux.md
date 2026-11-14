# Experiencia de uso Checklist: Explorador de tendencias por región (MVP)

**Purpose**: Comprobar que los requisitos de interfaz, accesibilidad y escena 3D están escritos con claridad y cobertura suficientes
**Created**: 2026-11-14
**Feature**: [spec.md](../spec.md) · [ux.md](../ux.md)

**Review Ownership**: lista propiedad de quien revisa. Marca `[x]` solo cuando el criterio de calidad del requisito se cumple; no indica que algo esté implementado. Ningún punto viene marcado.

## Requirement Completeness

- [ ] CHK001 ¿Está definida la acción inicial y qué ve la persona antes de elegir región? [Completeness, Spec §FR-013]
- [ ] CHK002 ¿Se especifican todos los estados de la interfaz: carga, vacío, error recuperable, datos insuficientes, sin datos y sin gráficos 3D? [Completeness, Spec §FR-015]
- [ ] CHK003 ¿Hay requisitos para la equivalencia entre seleccionar en el globo y por búsqueda? [Completeness, Spec §FR-002]
- [ ] CHK004 ¿Se define la alternativa textual del mapa y de la gráfica? [Completeness, Spec §US3, ux §6]
- [ ] CHK005 ¿Está especificado el comportamiento del panel y de la cámara en pantallas pequeñas para que la región no quede oculta? [Completeness, ux §5]

## Requirement Clarity

- [ ] CHK006 ¿Está cuantificado «objetivo táctil suficiente» y «foco visible»? [Clarity, Spec §FR-016]
- [ ] CHK007 ¿Se define con precisión qué codificación distingue tendencia, selección y falta de datos sin depender del color? [Clarity, Spec §FR-011]
- [ ] CHK008 ¿Queda definido qué animaciones se detienen con movimiento reducido y cuáles comunican estado? [Clarity, Spec §FR-017]
- [ ] CHK009 ¿Están fijados los cortes y etiquetas de la escala de color, o declarados como pendientes con criterio para fijarlos? [Ambiguity, contracts §map]

## Requirement Consistency

- [ ] CHK010 ¿Coincide el orden región/variable entre la especificación, los esquemas y los textos de ejemplo? [Consistency, ux §4, §5]
- [ ] CHK011 ¿Son coherentes los textos de cada estado con las reglas de redacción científica? [Consistency, Spec §FR-009, ux §7]

## Acceptance Criteria Quality

- [ ] CHK012 ¿Tienen los criterios de facilidad de uso tarea, umbral de éxito, tiempo y errores medibles? [Measurability, Spec §SC-001 a §SC-004]
- [ ] CHK013 ¿Están declarados como objetivos, y no como resultados, los umbrales de usabilidad y de rendimiento? [Clarity, ux §3, §8]

## Non-Functional Requirements

- [ ] CHK014 ¿Hay presupuesto de rendimiento con métricas y dispositivos de referencia definidos? [Completeness, ux §3]
- [ ] CHK015 ¿Se especifica quién libera cada recurso gráfico y cuándo se pausa el dibujo? [Completeness, ux §3]
- [ ] CHK016 ¿Existe un requisito de contraste mínimo para texto sobre el globo? [Gap]

## Dependencies & Assumptions

- [ ] CHK017 ¿Están identificadas las decisiones visuales abiertas (nombre, tipografía, créditos del evento)? [Assumption, ux §4]
- [ ] CHK018 ¿Se distingue en los documentos lo observado en el prototipo de lo propuesto y de lo pendiente de comprobar? [Traceability, ux §1 a §3]
