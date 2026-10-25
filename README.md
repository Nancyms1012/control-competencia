# 🚴 Control de Competencia

App web estática (sin backend) para llevar el control de una competencia de ciclismo con **dos competencias simultáneas** de distinta distancia y hora de salida.

Funciona **offline** en un solo dispositivo usando `localStorage`, con respaldo **exportar/importar JSON**.

## Pantallas

1. **⚙️ Configuración** — Datos de las dos competencias (nombre, distancia, hora de salida) e importación de la base de datos de ciclistas desde un **CSV delimitado por `;`**.
2. **🚦 Salidas** — Reloj en vivo + cronómetros por competencia + panel para dar salida:
   - Se **marcan** las categorías que arrancan en la tanda y se aprieta el botón grande **▶️ DAR SALIDA** en el instante del banderazo (hora exacta del clic, sin desfase).
   - Si **no** hay ninguna categoría marcada, el botón da **salida general** a toda la competencia.
   - El tiempo de cada ciclista usa la hora de salida de **su categoría** si la tiene; si no, usa la salida general de la competencia.
   - Botón **🗑️ Borrar salidas** (no borra base de datos ni llegadas).
3. **⏱️ Registro** — Pantalla limpia: reloj en vivo + campo de **dorsal**. Se digita el dorsal y Enter: autocompleta nombre, categoría, equipo, hora de llegada y calcula el **tiempo**. Botón **🗑️ Borrar llegadas** (no borra base de datos ni salidas).
4. **🏆 Resultados** — Tiempos ordenados de menor a mayor, agrupados por **competencia y categoría**, con podio (🥇🥈🥉). Filtros por competencia y categoría. Botón de imprimir/PDF.

## Formato del CSV

Delimitado por punto y coma `;`, en este orden de columnas:

```
categoría;dorsal;nombre;equipo
```

Ejemplo:

```
Elite;101;Juan Pérez;Team A
Elite;102;María López;Team B
Máster A;201;Carlos Soto;Team C
```

La primera fila puede ser un encabezado (se detecta automáticamente) o directamente datos.

## Uso

Abrí `index.html` en el navegador. No requiere instalación ni servidor.

## Despliegue (Cloudflare Pages)

- Preset: **None**
- Build command: *(vacío)*
- Output directory: `/`

## Persistencia

Todo se guarda en `localStorage` bajo la clave `controlCompetencia_v1`. Para pasar los datos entre dispositivos, usá los botones **Exportar / Importar respaldo** (.json).
