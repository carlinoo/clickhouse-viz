# ClickHouse Schema Visualizer

Visualizador de esquemas ClickHouse. **Sin dependencias npm**, solo Node.js nativo.

## Requisitos

- Node.js 18+ (usa el HTTP client nativo)
- ClickHouse corriendo con la interfaz HTTP habilitada (puerto 8123 por defecto)

## Instalación

```bash
# 1. Copia los archivos a tu VM (o clona el repo)
scp -r clickhouse-viz/ tu-vm:/opt/clickhouse-viz/

# 2. Entra a la carpeta
cd /opt/clickhouse-viz

# 3. Arranca (con config por defecto: localhost:8123, user=default, sin password)
node server.js
```

Abre `http://localhost:3000` en tu navegador.

---

## Configuración

Todo por variables de entorno, sin tocar código:

| Variable              | Default       | Descripción                              |
|-----------------------|---------------|------------------------------------------|
| `CLICKHOUSE_HOST`     | `localhost`   | Host de ClickHouse                       |
| `CLICKHOUSE_PORT`     | `8123`        | Puerto HTTP de ClickHouse                |
| `CLICKHOUSE_USER`     | `default`     | Usuario                                  |
| `CLICKHOUSE_PASSWORD` | `` (vacío)    | Contraseña                               |
| `CLICKHOUSE_DATABASE` | `` (vacío)    | Base de datos concreta (vacío = todas)   |
| `CLICKHOUSE_HTTPS`    | `false`       | Usar HTTPS en vez de HTTP                |
| `PORT`                | `3000`        | Puerto del servidor web                  |

### Ejemplos

```bash
# Con contraseña
CLICKHOUSE_PASSWORD=mi_password node server.js

# Solo una base de datos
CLICKHOUSE_DATABASE=mi_bbdd node server.js

# ClickHouse en otra máquina
CLICKHOUSE_HOST=192.168.1.50 CLICKHOUSE_PORT=8123 node server.js

# Todo junto
CLICKHOUSE_HOST=192.168.1.50 CLICKHOUSE_USER=admin CLICKHOUSE_PASSWORD=pass PORT=8080 node server.js
```

---

## Ejecutar como servicio (systemd)

Para que arranque automáticamente con la VM:

```bash
sudo nano /etc/systemd/system/ch-viz.service
```

```ini
[Unit]
Description=ClickHouse Schema Visualizer
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/clickhouse-viz
ExecStart=/usr/bin/node server.js
Environment=CLICKHOUSE_HOST=localhost
Environment=CLICKHOUSE_PORT=8123
Environment=CLICKHOUSE_USER=default
Environment=CLICKHOUSE_PASSWORD=
Environment=PORT=3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ch-viz
sudo systemctl start ch-viz
sudo systemctl status ch-viz
```

---

## Funcionalidades

- **Carga automática** del esquema al arrancar
- **Botón ↻ Recargar** para refrescar sin reiniciar el servidor
- **Filtro por base de datos** (pills en la toolbar)
- **Búsqueda** por nombre de tabla, campo o tipo
- **Drag & drop** de las tarjetas
- **Zoom** con rueda del ratón o botones +/−
- **Fit all** para ajustar todas las tablas en pantalla (tecla `0`)
- **Ver DDL** completo haciendo doble click en la cabecera o en "DDL ↗"
- **Columnas clave**: punto naranja = PRIMARY/SORTING KEY

### Atajos de teclado

| Tecla | Acción            |
|-------|-------------------|
| `+/-` | Zoom in/out       |
| `0`   | Fit all           |
| `f`   | Foco en búsqueda  |
| `Esc` | Cerrar modal DDL  |

---

## API endpoints

El servidor expone también:

- `GET /api/schema` — JSON con todas las tablas y columnas
- `GET /api/health` — Estado de la conexión a ClickHouse

Útil si quieres integrarlo con otras herramientas.
