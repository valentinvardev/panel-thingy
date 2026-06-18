# SMM World — Panel de API

Panel ligero (sin dependencias, Node nativo) para la API de [SMM World](https://smmworld.org/api/v2).
Consulta **balance**, **servicios** y **estado de órdenes**, y coloca órdenes de **comentarios**, **likes** y **saves**.

> ⚠️ Coloca órdenes reales que consumen tu balance. Pensado para uso personal en red local.

## Uso

1. Copia la plantilla de configuración y rellénala:
   ```bash
   cp config.example.json config.json
   ```
   - `smmKey`: tu API key (Account page de SMM World). Si la dejas vacía, se usa la que escribas en el navegador.
   - `password`: si la rellenas, el panel pedirá login (HTTP Basic Auth). Vacía = sin login.
2. Arranca el servidor:
   ```bash
   node server.js
   ```
3. Abre `http://localhost:3000` (o la URL de tu red local que imprime al arrancar).

## Funciones

- **Enlace común** para las 3 cards de órdenes.
- **Comentarios** uno por línea, con listas guardadas por título.
- **Likes** y **Saves** por cantidad.
- **Órdenes recientes** con marca ✓/✗; un servicio marcado ✗ se resalta en rojo durante 24 h.
- Modal de confirmación antes de cada orden.

## Notas

- `config.json` está en `.gitignore`: no subas tu API key al repositorio.
- El servidor solo permite las acciones `balance`, `services`, `status` y `add`.
