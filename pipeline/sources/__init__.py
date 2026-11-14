"""Adaptadores de fuente con una interfaz común (FR-D01, T016).

Cada fuente devuelve un `GridData`: valores mensuales por celda en la unidad nativa de su `VarDef.spec`,
más la procedencia. A partir de ahí la ruta es la misma para todas: pesos → serie regional → años completos
→ ventanas → escritura validada todo o nada.
"""
