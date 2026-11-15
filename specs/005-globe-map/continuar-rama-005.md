# Cómo continuar tu rama 005

Estado documentado el 14 de noviembre de 2026. Tu rama es `005-globe-map` y se entrega a `sync_main`; quien lleva 002 revisa y realiza la fusión.

## Estado recibido

Según el relevo anterior:

- Se incorporó `sync_main` mediante una fusión local sin conflictos, para evitar reescribir una rama ya publicada.
- Se sustituyó `T2M` por `air_temperature` en `globe.test.ts`.
- El mapa toma la paleta Ocaso y la opacidad del 90 % de las variables de diseño (`--map-fill-opacity`).
- Las muestras de la leyenda tienen un borde claro para distinguir los extremos de Ocaso del fondo.
- La compilación, el linter y las 96 pruebas pasaron. GKing73 corrigió la prueba del armazón que fallaba antes.

Al crear este documento se comprobó que estás en `005-globe-map`, cinco commits por delante de `origin/005-globe-map`, con estos cinco archivos modificados sin commit:

- `web/src/features/globe/GlobeStage.tsx`
- `web/src/features/globe/copy.ts`
- `web/src/features/globe/globe.css`
- `web/src/features/globe/globe.test.ts`
- `web/src/features/globe/mapColors.ts`

Los resultados de las pruebas son los del relevo: no se volvieron a ejecutar para escribir esta guía. La nota de `tasks.md` sobre el fallo del armazón corresponde al estado anterior a la corrección de 002.

## 1. Revisar y guardar lo pendiente

Ejecuta desde la raíz del repositorio. Confirma primero que sigues en tu rama:

```bash
git branch --show-current
git status
git diff -- web/src/features/globe
```

Debe aparecer `005-globe-map`. Si Git indica una fusión en curso, revisa ese estado antes de continuar; el relevo describe una fusión ya hecha localmente.

Repite las comprobaciones antes de entregar:

```bash
cd web
npm run build
npm run lint
npm run test
cd ..
```

Si pasan, guarda el código y esta guía:

```bash
git add web/src/features/globe
git add specs/005-globe-map/continuar-rama-005.md
git diff --cached --stat
git commit -m "feat(web): globo con ids de variable nuevos y paleta Ocaso (005)"
git push origin 005-globe-map
```

El push publica también los commits locales anteriores, incluida la fusión. Si lo rechaza porque el remoto avanzó, revisa y sincroniza esos cambios antes de volver a intentar; no fuerces el push para resolverlo automáticamente.

## 2. Probar tú la interfaz

```bash
cd web
npm run dev
```

Abre la dirección que indique Vite (normalmente `http://localhost:5173`). Comprueba:

- [ ] La paleta Ocaso se distingue sobre el fondo y los bordes de la leyenda son visibles.
- [ ] El relleno tiene la opacidad esperada y la selección conserva borde, elevación y nombre legibles.
- [ ] Al cambiar variable o periodo se actualizan mapa, leyenda y tabla.
- [ ] La precipitación muestra las unidades correctas en `% por década` y concuerda con los datos y la leyenda.
- [ ] El clic en el globo y la búsqueda seleccionan la misma región.
- [ ] La región seleccionada queda visible fuera del panel en escritorio y móvil.
- [ ] La interacción funciona con teclado y tacto; «sin datos» se distingue sin depender solo del color.

Si detectas un fallo, corrígelo en tus rutas, repite las comprobaciones pertinentes y publica otro commit.

## 3. Completar T008 con dispositivos reales

T008 sigue pendiente. La emulación móvil y las mediciones headless existentes no sustituyen un teléfono y un portátil reales.

Consulta el presupuesto de [UX, sección 3](../001-trend-explorer-mvp/ux.md) y el criterio SC-G03 de [tu especificación](spec.md). Registra los resultados en [tasks.md](tasks.md), junto a las mediciones existentes:

| Dispositivo real | SO y navegador | Escenario y tamaño de pantalla | Tiempo por cuadro | Objetivo cumplido | Decisión si no cumple |
|---|---|---|---|---|---|
| Teléfono: modelo pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Portátil: modelo pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |

Anota también la fecha, cómo mediste y si hubo problemas al interactuar o volver al reposo. Marca T008 como completada solo después de medir y dejar una decisión para cada objetivo incumplido. Guarda y publica los resultados:

```bash
git add specs/005-globe-map/tasks.md
git commit -m "docs(005): registrar mediciones en dispositivos reales"
git push origin 005-globe-map
```

## 4. Entregar a quien lleva 002

```bash
git fetch origin
git diff --name-only origin/sync_main...HEAD
git status
```

Revisa que los cambios propios estén dentro de las rutas asignadas a 005. Abre la petición de fusión con origen `005-globe-map` y destino `sync_main`, y comparte el enlace con quien lleva 002.

Incluye en la descripción los cambios de variables y paleta, los resultados actuales de build/lint/tests, la prueba visual y las mediciones T008. Si queda algo pendiente, indícalo y no presentes la rama como terminada. Para cerrar tu parte, sigue también el requisito de `/speckit-converge` de [metodologia.md](../../metodologia.md).

## Actualizaciones futuras: fusión y rebase

[metodologia.md](../../metodologia.md) propone rebase al entregar. En este relevo se usó una fusión porque la rama ya estaba publicada. Para incorporar futuras actualizaciones sin reescribir su historial, empieza con los cambios guardados y ejecuta en `005-globe-map`:

```bash
git fetch origin
git merge origin/sync_main
```

Resuelve los conflictos si aparecen, repite las comprobaciones y publica con un push normal. No hace falta repetir la fusión que ya está hecha.

Si el equipo decide usar rebase después de publicar la rama, puede ser necesario `git push --force-with-lease origin 005-globe-map`; coordínalo antes con quienes usen esa rama porque reescribe el historial remoto. Queda propuesta para 002 la aclaración de estas dos opciones en la metodología compartida; esta guía no modifica ese archivo.
