# Guion de la demostración (≤ 3 min)

Feature 006 · T007 · Cumple FR-C05: texto exacto palabra por palabra y tiempo por sección.

**Duración total: 2 min 50 s** (10 s de margen).

## Antes de empezar (no cuenta en el tiempo)

- [ ] La aplicación carga datos **reales**: no aparece el aviso «Datos de ejemplo sintéticos». **Con datos sintéticos no se hace la demo.**
- [ ] Ventana en blanco: sin región elegida, se ve la tarjeta de bienvenida.
- [ ] Se ensayó una vez con los datos publicados y los «valores de ensayo» de §2 y §3 coinciden con la pantalla (si 003 regenera los datos, se actualizan).
- [ ] Movimiento reducido desactivado, para que se vea el vuelo de cámara. Volumen y notificaciones apagados.

**Regla del guion.** Lo que está entre corchetes y en cursiva, *[así]*, **se lee tal como sale en pantalla**: no se redondea ni se cambia. El guion no anticipa ningún resultado: si la pantalla dice otra cosa, se lee lo que dice la pantalla.

---

## 1. Apertura · 0:00–0:20 (20 s)

**Pantalla:** tarjeta de bienvenida con el globo detrás.

> «¿Ha cambiado el clima donde vives? Trend Detective responde esa pregunta para cada estado de México y de Estados Unidos, con datos de la NASA desde 1980. No da opiniones: da una cifra, cuánta evidencia la respalda y qué no se puede concluir de ella.»

## 2. Primer caso: Baja California, temperatura · 0:20–1:25 (65 s)

**Acción (0:20):** tocar «Ver un ejemplo · Baja California · Temperatura».

> «Con un toque, el globo vuela a Baja California y se abre el análisis de la temperatura del aire, de 1980 a 2025.»

**Acción (0:28):** señalar el veredicto.

> «El veredicto es: sin evidencia suficiente. Esto es lo más fácil de leer mal, así que lo digo despacio: no significa que no haya cambio. La estimación es de *[cifra con su unidad]* por década, pero el intervalo incluye el cero: con estos datos no se puede distinguir una tendencia del azar. La aplicación nunca escribe "no hay cambio", porque eso no se puede demostrar.»

**Acción (0:50):** señalar la gráfica.

> «Cada punto es un año completo. La recta es la pendiente de Sen: la mediana de las pendientes entre todos los pares de años, así que un año extremo la mueve poco. La banda es el intervalo del noventa y cinco por ciento.»

**Acción (1:02):** tocar «Ver cómo cambia según el año inicial».

> «Y aquí está la lección honesta: el resultado depende del periodo. Si el análisis empieza en 1981 en lugar de 1980, el veredicto cambia. Por eso la aplicación muestra siempre el periodo y avisa cuando no es el completo.»

**Valores de ensayo** (datos de 003 del 2026-11-14; si la pantalla dice otra cosa, se lee la pantalla): +0.14 °C por década, intervalo de −0.01 a +0.28, p = 0.066, 46 años. Empezando en 1981 el veredicto es «Sube». La serie tiene un salto marcado hacia 2014 (`diagnostics.step_year`); si preguntan: «el pipeline detecta un salto en 2014 y lo registra; es otra razón para leer este caso con cautela».

## 3. Segundo caso: Chihuahua, temperatura · 1:25–2:15 (50 s)

**Por qué este caso (T013):** contrasta con el primero. Chihuahua **sube con evidencia** en 1980–2025 y con casi cualquier año inicial hasta 2015. No es Sonora a propósito: «Encuentra Sonora» es la tarea 1 de la prueba con usuarios.

**Acción (1:25):** volver al inicio y tocar «Ver un ejemplo · Chihuahua · Temperatura».

> «Ahora un estado vecino con otro resultado: Chihuahua.»

**Acción (1:30):** señalar el veredicto y la cifra.

> «Aquí el veredicto es: sube. *[Cifra con su unidad]* por década, con un intervalo de *[intervalo]*, todo por encima de cero, y un valor p de *[valor p]*: un patrón así sería muy raro si no hubiera tendencia.»

**Acción (1:50):** señalar la frase «En palabras» y su última línea.

> «Que la evidencia sea fuerte no dice por qué ocurre ni si continuará. Y significativo no quiere decir grande ni grave: el valor p dice cuánta evidencia hay; la pendiente, cuánto cambia. Qué implica para Chihuahua es otra pregunta.»

**Valores de ensayo:** +0.47 °C por década, intervalo de +0.32 a +0.65, p < 0.001, 46 años.

## 4. Métodos y límites · 2:15–2:40 (25 s)

**Acción (2:15):** tocar «Métodos».

> «Todo el método está aquí, en lenguaje llano: prueba de Mann-Kendall corregida por autocorrelación, pendiente de Sen y alfa de cero punto cero cinco, fijado antes de mirar los datos. Y también sus límites: la corrección no es perfecta, la precipitación tiene menos años que la temperatura, de 2001 a 2024, y con tantos estados algunos destacarán por azar.»

## 5. Cierre · 2:40–2:50 (10 s)

> «Trend Detective: cuánto cambió, cuánta evidencia hay y qué no se puede concluir. Datos de la NASA, explicados sin exagerar. Gracias.»

---

## Atribuciones que deben verse o decirse

Se muestran en «Métodos» → «Cómo citar». Si el jurado pide la fuente, se lee esto:

| Variable | Producto | Cita |
|---|---|---|
| Temperatura del aire | MERRA-2 `M2TMNXSLV` v5.12.4 (reanálisis) | Global Modeling and Assimilation Office (GMAO) (2015), MERRA-2 tavgM_2d_slv_Nx: 2d, Monthly mean, Time-Averaged, Single-Level, Assimilation, Single-Level Diagnostics V5.12.4, Greenbelt, MD, USA, GES DISC. doi:10.5067/AP1B0BA5PD2K |
| Precipitación | GPM IMERG Final `GPM_3IMERGM` V07 (observación de satélite) | Huffman, G.J., E.F. Stocker, D.T. Bolvin, E.J. Nelkin, J. Tan (2023), GPM IMERG Final Precipitation L3 1 month 0.1 degree x 0.1 degree V07, Greenbelt, MD, GES DISC. doi:10.5067/GPM/IMERG/3B-MONTH/07 |

- Los dos DOI coinciden con los que trae `provenance.doi` en los archivos reales de 003 (2026-11-14).
- Si 003 llegara a publicar con la alternativa NASA POWER, la cita es la de [`pipeline/ATTRIBUTION.md`](../pipeline/ATTRIBUTION.md); la hoja de métodos lo detecta sola por el `kind` del catálogo y en el guion se dice «la precipitación procede de un reanálisis y su tendencia es menos fiable».
- Cada valor es un promedio de área del estado, no el de una estación: si se pregunta, se dice así.
- Texturas del globo (`web/public/textures/`, p. ej. `earth-blue-marble.jpg`): **005 aún no declara su origen ni su licencia**. Petición abierta a quien lleva 005; hasta tenerla, no se afirma ninguna fuente para las texturas.

## Frases que no se dicen nunca

«No hay cambio» · «esto se debe a…» / «por culpa de…» · «seguirá subiendo» · «es significativo, así que es grave» · «faltan X años para que sea significativo».
