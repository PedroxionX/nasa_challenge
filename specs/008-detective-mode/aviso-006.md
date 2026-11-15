# Aviso para quien lleva 006 · lo que 008-detective-mode toca en tu parte

Actualizado el 2026-11-15, tras rebasar sobre `sync_main`. PR: https://github.com/PedroxionX/nasa_challenge/pull/20

---

Hola 👋 Te aviso que abrí el **PR #20** (rama `008-detective-mode` → `sync_main`), que agrega el **modo detective**.

Toca algunas cosas de tu parte, todas mínimas:

**1. `WelcomeCard.tsx`**
Solo agregué el botón del detective: una importación y `<DetectiveMode />` debajo de los ejemplos. **Tus ejemplos
(Baja California y Chihuahua) se quedan tal cual.** Yo tenía Hidalgo como segundo ejemplo, pero al rebasar vi que
ya habías elegido Chihuahua y me quedé con tu versión.

**2. `content/index.ts`**
Agregué un bloque nuevo, «Modo detective (008)», después de tu bloque `SUBJECT`. No cambié nada tuyo: ni
`VARIABLE_COPY`, ni `UI_COPY`, ni `explainTrend`. Como cambiaste `fmt` para recibir los decimales, en mi bloque lo
llamo con `fmt(x, 2)`.

**3. Un estilo que cambia cómo se ven tus ejemplos**
En `detective/detective.css` puse los dos ejemplos **lado a lado** (en dos columnas), para que la tarjeta no crezca
hacia arriba y tape «Ver tabla / Vista global» de la leyenda. Si prefieres otra solución, dime y quito esa regla.

**4. Lo que más necesito: revisar unos textos 🙏**
Al final de cada resultado del detective hay una sección **«🌍 ¿Por qué importa para la Tierra?»**, con 2 o 3 frases
para cada una de las 14 variables. Están en `DETECTIVE_COPY.why`, dentro de `web/src/content/index.ts`.
- Hablan del tema en general (por ejemplo, la nieve como depósito natural de agua), **no de por qué cambió ese lugar
  ni de si va a seguir**.
- Una prueba automática revisa que no digan «porque», «debido a», «seguirá», etc.
- **No citan fuente.** Como tú llevas el contenido, ¿podrías revisarlos antes de la entrega? Puedes corregirlos
  directamente ahí.

Las pruebas pasan (366, incluidas las tuyas y las de la 007). Si algo no te cuadra, me dices y lo cambio.
