# ClickHouse Schema Visualizer

ClickHouse schema visualizer. **No npm dependencies**, pure Node.js.

## Requirements

- Node.js 18+ (uses the native HTTP client)
- ClickHouse running with the HTTP interface enabled (port 8123 by default)

## Installation

```bash
# 1. Copy the files to your VM (or clone the repo)
scp -r clickhouse-viz/ your-vm:/opt/clickhouse-viz/

# 2. Enter the directory
cd /opt/clickhouse-viz

# 3. Start (with default config: localhost:8123, user=default, no password)
node server.js
```

Open `http://localhost:3000` in your browser.

---

## Configuration

Everything via environment variables, no code changes needed:

| Variable              | Default       | Description                              |
|-----------------------|---------------|------------------------------------------|
| `CLICKHOUSE_HOST`     | `localhost`   | ClickHouse host                          |
| `CLICKHOUSE_PORT`     | `8123`        | ClickHouse HTTP port                     |
| `CLICKHOUSE_USER`     | `default`     | User                                     |
| `CLICKHOUSE_PASSWORD` | `` (empty)    | Password                                 |
| `CLICKHOUSE_DATABASE` | `` (empty)    | Specific database (empty = all)          |
| `CLICKHOUSE_HTTPS`    | `false`       | Use HTTPS instead of HTTP                |
| `PORT`                | `3000`        | Web server port                          |

### Examples

```bash
# With password
CLICKHOUSE_PASSWORD=my_password node server.js

# Single database
CLICKHOUSE_DATABASE=my_db node server.js

# ClickHouse on another machine
CLICKHOUSE_HOST=192.168.1.50 CLICKHOUSE_PORT=8123 node server.js

# All together
CLICKHOUSE_HOST=192.168.1.50 CLICKHOUSE_USER=admin CLICKHOUSE_PASSWORD=pass PORT=8080 node server.js
```

---

## Run as a service (systemd)

To start automatically with the VM:

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

## Features

- **Auto-load** schema on startup
- **↻ Reload button** to refresh without restarting the server
- **Database filter** (dropdown in the toolbar)
- **Search** by table name, field, or type
- **Drag & drop** table cards
- **Zoom** with mouse wheel or +/− buttons
- **Fit all** to fit all tables on screen (key `0`)
- **View DDL** by double-clicking the card header or clicking "DDL ↗"
- **Key columns**: orange dot = PRIMARY/SORTING KEY

### Keyboard shortcuts

| Key   | Action            |
|-------|-------------------|
| `+/-` | Zoom in/out       |
| `0`   | Fit all           |
| `f`   | Focus search      |
| `Esc` | Close DDL modal   |

---

## API endpoints

The server also exposes:

- `GET /api/schema` — JSON with all tables and columns
- `GET /api/health` — ClickHouse connection status

Useful if you want to integrate it with other tools.
