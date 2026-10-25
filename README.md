# 🚴 Control de Competencia

App web estática (sin backend) para llevar el control de una competencia de ciclismo con **dos competencias simultáneas** de distinta distancia y hora de salida.

Funciona **offline** en un solo dispositivo usando `localStorage`, con respaldo **exportar/importar JSON**.

## Pantallas

1. **⚙️ Configuración** — Datos de las dos competencias (nombre, distancia, hora de salida) e importación de la base de datos de ciclistas desde un **CSV delimitado por `;`**.
2. **⏱️ Registro** — Reloj en vivo + cronómetros por competencia. Se digita el **dorsal** y Enter: autocompleta nombre, categoría, equipo, hora de llegada y calcula el **tiempo** (hora de llegada − hora de salida).
   - **Dar salida general** por competencia con la hora actual (botón ▶️).
   - **Salidas escalonadas por categoría**: panel con todas las categorías de cada competencia; se marcan las que salen juntas y se les da salida con la hora actual. El tiempo de cada ciclista usa la hora de salida de **su categoría** si la tiene; si no, usa la salida general de la competencia.
3. **🏆 Resultados** — Tiempos ordenados de menor a mayor, agrupados por **competencia y categoría**, con podio (🥇🥈🥉). Filtros por competencia y categoría. Botón de imprimir/PDF.

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
