# Estado de presentación

No se añade persistencia ni se cambia el modelo científico de 001/007.

| Entidad | Campos existentes / regla |
|---|---|
| Selección | regionId, compareId, variableId, from, to; conservar al redimensionar. |
| Disposición | Lateral cuando ancho ≥900, o ancho ≥600 y alto ≤500; hoja en los demás casos. |
| Hoja | Una nueva región comienza en peek; Ver análisis → half, Ampliar análisis → full. Ver globo vuelve directamente a peek desde half o full. |
| Insets | right y bottom en px para panel/bienvenida; top para las herramientas compactas. La cámara se centra en el rectángulo restante. |
| Desplazamiento | Bienvenida, cuerpo, diálogos y tablas se desplazan en su propio contenedor. |

Al girar el teléfono cambia la disposición sin modificar la selección. Al cerrar la región la bienvenida sustituye al panel en la medición; sin WebGL la bienvenida va en flujo y no publica una reserva inferior. Se conserva el estado previo de la hoja al volver a vertical para la misma región. Cambiar región, variable o comparación reinicia el scroll; volver a peek también vuelve al título.
