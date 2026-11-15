# Aviso para quien lleva 007 · cómo convivir con 008-detective-mode

Pega el bloque de abajo en tu sesión de Claude Code (en tu rama `007-region-comparison`), o léelo tú.

---

```text
Contexto: hay una rama nueva, 008-detective-mode (spec en specs/008-detective-mode/spec.md), que agrega un
«Modo detective» a la portada. Toca tres archivos que mi rama 007 también modifica. NO cambies nada de 008
por adelantado: esto es solo para que sepas qué esperar y cómo resolverlo cuando una de las dos ramas
llegue a sync_main antes que la otra.

Archivos compartidos y qué hace cada rama:

1. web/src/features/guide/WelcomeCard.tsx
   - 007 cambia: la importación `VARIABLE_COPY` → `variableCopy`, la firma de `openExample` a
     `variableId: string`, y `VARIABLE_COPY.air_temperature.short` → `variableCopy('air_temperature').short`.
   - 008 cambia: (a) añade UNA línea de importación del modo detective DESPUÉS de `import './guide.css'`,
     (b) sustituye el bloque del segundo ejemplo («Próximamente», el comentario TODO(003) y el botón
     desactivado) por un ejemplo real de Hidalgo · Precipitación que llama `openExample('MX-HID',
     'precipitation')`, y (c) añade el botón «Investigar como detective» debajo de los ejemplos.
   - Al fusionar: git lo resuelve solo. Se simuló la fusión de tres vías de ambos archivos (2026-11-14) y dio
     0 conflictos. Si aun así marca alguno, conserva AMBOS cambios.
   - OJO, esto no lo detecta git: tras la fusión, la importación queda como `variableCopy` (la tuya) pero el
     segundo ejemplo de 008 sigue usando `VARIABLE_COPY.precipitation.short`. No compila. Cámbialo a
     `variableCopy('precipitation').short`, igual que hiciste con el primero. `npx tsc --noEmit` lo señala.

2. web/src/content/index.ts
   - 007 cambia: las importaciones del principio, `VARIABLE_COPY` a `Partial`, añade `variableCopy` y añade
     su bloque de comparación AL FINAL del archivo.
   - 008: añade un bloque «Modo detective» (`DETECTIVE_COPY`, `revealPrediction` y sus tipos) ENTRE `fmtP` y
     `explainTrend`. No toca las importaciones, ni `VARIABLE_COPY`, ni el final del archivo.
   - Al fusionar no hay conflicto (simulado). Si lo hubiera, conserva los dos bloques completos.

3. web/src/features/guide/index.ts
   - 008 no lo tocó al final.

4. Estilo de la tarjeta de bienvenida (punto de contacto con 006, avisado en aviso-006.md)
   - 008 pone en dos columnas `.welcome-examples` desde web/src/features/guide/detective/detective.css, para
     que la tarjeta no tape la leyenda del mapa. Tu rama no toca esos estilos: no hay conflicto. Si añades
     algo a la tarjeta (p. ej. una entrada a la comparación), revisa en pantalla que siga sin encimarse con
     «Ver tabla / Vista global».

Nota Windows: con core.autocrlf=true la copia de trabajo está en CRLF. Si simulas la fusión con
`git merge-file` sobre archivos copiados, normaliza antes a LF o verás el archivo entero en conflicto
(es falso: git normaliza al hacer commit).

Tipos: 008 no usa `VARIABLE_IDS` (tu rama la elimina) ni depende de que `VariableId` sea una unión: lee las
variables de `catalog.variables`. Compila antes y después de tu cambio de `VariableId` a `string`.

Cómo comprobar después de resolver, en web/:
  npm run test
  npx tsc --noEmit
  npm run dev   → la portada muestra los dos ejemplos activos y el botón del modo detective; el segundo
                  ejemplo abre Hidalgo con precipitación.

Orden: da igual cuál entre primero a sync_main. La que entre segunda hace `git rebase origin/sync_main`
y aplica lo de arriba. Si entra 007 primero, la persona de 008 hace el cambio de `variableCopy`; si entra
008 primero, lo haces tú.
```
