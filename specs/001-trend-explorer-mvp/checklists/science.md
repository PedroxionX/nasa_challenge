# Rigor científico Checklist: Explorador de tendencias por región (MVP)

**Purpose**: Comprobar que los requisitos científicos y de datos están escritos con claridad y cobertura suficientes
**Created**: 2026-11-14
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md) · [data-model.md](../data-model.md)

**Review Ownership**: lista propiedad de quien revisa. Marca `[x]` solo cuando el criterio de calidad del requisito se cumple; no indica que algo esté implementado. Ningún punto viene marcado.

## Requirement Completeness

- [ ] CHK001 ¿Está especificado qué representa el valor regional y cómo se comunica cuando la región es menor que una celda? [Completeness, Spec §FR-003, Edge Cases]
- [ ] CHK002 ¿Se definen los requisitos de procedencia campo por campo y son obligatorios para toda serie? [Completeness, Spec §FR-010, data-model §Provenance]
- [ ] CHK003 ¿Está definido el tratamiento de años incompletos, valores de relleno y año en curso? [Completeness, Spec §Edge Cases, plan §Método]
- [ ] CHK004 ¿Se especifica cómo se tratan estacionalidad y autocorrelación, y cuándo se advierte de sus límites? [Completeness, Spec §FR-007]
- [ ] CHK005 ¿Existe un requisito sobre comparaciones múltiples en el mapa y selección del periodo? [Completeness, Spec §FR-019]
- [ ] CHK006 ¿Se documenta la limitación de la precipitación de reanálisis para tendencias como requisito de comunicación y no solo como nota del plan? [Gap]

## Requirement Clarity

- [ ] CHK007 ¿Están definidos pendiente, intervalo, valor p y α en términos que la interfaz pueda mostrar sin reinterpretar? [Clarity, research §D6]
- [ ] CHK008 ¿Es inequívoca la regla que asigna cada estado del análisis, incluido el umbral de 10 años? [Clarity, data-model §TrendResult]
- [ ] CHK009 ¿Queda claro que el intervalo y la prueba proceden de métodos coherentes entre sí y cuál es el de contraste? [Clarity, Spec §FR-006, §FR-012]
- [ ] CHK010 ¿Se distingue temperatura del aire de temperatura de superficie, y tasa de acumulado de precipitación, en los requisitos de definición de variables? [Clarity, Spec §FR-001, research §D3]

## Requirement Consistency

- [ ] CHK011 ¿Coinciden los estados del análisis entre la especificación, el modelo de datos y el contrato? [Consistency, Spec §FR-008]
- [ ] CHK012 ¿Es coherente el mínimo de 30 años disponibles con el mínimo de 10 años para emitir veredicto? [Consistency, Spec §FR-004, §US2]

## Acceptance Criteria Quality

- [ ] CHK013 ¿Tienen tolerancias numéricas explícitas los criterios de validación frente a referencias? [Measurability, Spec §SC-006, §SC-007, plan §Validación]
- [ ] CHK014 ¿Puede verificarse objetivamente que una explicación no afirma causalidad ni ausencia de cambio? [Measurability, Spec §FR-009]

## Scenario & Edge Case Coverage

- [ ] CHK015 ¿Hay requisitos para series constantes, con muchos empates o con un salto abrupto? [Coverage, Spec §Edge Cases]
- [ ] CHK016 ¿Se especifica qué ocurre si una región no tiene ninguna celda o la fuente cambia de versión entre descargas? [Coverage, Gap]

## Dependencies & Assumptions

- [ ] CHK017 ¿Está validado el supuesto de que la fuente elegida seguirá accesible sin credenciales durante el evento, y existe alternativa documentada? [Assumption, research §D2]
- [ ] CHK018 ¿Se declara la versión exacta del producto subyacente o queda como pendiente con forma de resolverlo? [Assumption, research §D3]
