# Contrato de presentación adaptable

- `DESKTOP_QUERY` de `web/src/app/Shell.tsx` coincide con la condición del panel lateral en `shell.css`: ≥900 px o ancho ≥600 px y alto ≤500 px.
- `--panel-inset-right` y `--panel-inset-bottom` conservan nombres y unidades: píxeles. La cámara y la alternativa sin WebGL siguen consumiéndolos.
- `--globe-inset-top` reserva en píxeles la altura medida de las herramientas compactas; se limpia al desmontarlas. La bienvenida compacta aporta la reserva inferior al inicio.
- Al cambiar los insets, la cámara encuadra la región principal o las dos regiones del par, según el modo activo.
- El estado URL conserva `region`, `vs`, `var`, `from`, `to`; este incremento no escribe una disposición en el enlace.
- La hoja inicia en resumen. Los controles se llaman Ver análisis, Ampliar análisis y Ver globo. Se puede volver directamente al resumen desde cualquiera de las dos alturas de lectura; el cuerpo controlado mantiene id estable y vuelve al título.
- Cada tabla ancha conserva su semántica HTML y está envuelta en un contenedor con nombre accesible, foco de teclado y overflow local; no se eliminan columnas científicas.
- Los métodos conservan su diálogo nativo, cierre y Escape. La definición de variable conserva el botón que la abre y cierra.
- El recorrido sigue disponible con gráficos 3D desactivados; la bienvenida no debe cubrir la tabla.
