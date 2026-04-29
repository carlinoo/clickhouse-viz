# ClickHouse Visualizer

A lightweight, zero-dependency ClickHouse schema visualizer. Runs as a single Docker container — no database setup, no external services.

## Quick start

```bash
docker run -d \
  --name ch-viz \
  --restart unless-stopped \
  --network host \
  -e CLICKHOUSE_HOST=localhost \
  -e CLICKHOUSE_PORT=8123 \
  -e CLICKHOUSE_USER=default \
  -e CLICKHOUSE_PASSWORD="" \
  carlino/clickhouse-viz:latest
```

Open `http://localhost:63721` in your browser.

> **Note:** `--network host` is needed when ClickHouse runs on the same machine. Remove it if connecting to a remote host.

---

## Configuration

All configuration is done via environment variables — no config files needed.

| Variable              | Default     | Description                             |
|-----------------------|-------------|-----------------------------------------|
| `CLICKHOUSE_HOST`     | `localhost` | ClickHouse hostname or IP               |
| `CLICKHOUSE_PORT`     | `8123`      | ClickHouse HTTP interface port          |
| `CLICKHOUSE_USER`     | `default`   | ClickHouse user                         |
| `CLICKHOUSE_PASSWORD` | *(empty)*   | ClickHouse password                     |
| `CLICKHOUSE_DATABASE` | *(empty)*   | Restrict to a single database           |
| `CLICKHOUSE_HTTPS`    | `false`     | Use HTTPS instead of HTTP               |
| `PORT`                | `63721`     | Port exposed by the web server          |

### Examples

```bash
# Remote ClickHouse with auth
docker run -d --name ch-viz -p 63721:63721 \
  -e CLICKHOUSE_HOST=192.168.1.50 \
  -e CLICKHOUSE_USER=admin \
  -e CLICKHOUSE_PASSWORD=secret \
  carlino/clickhouse-viz:latest

# Single database
docker run -d --name ch-viz -p 63721:63721 \
  -e CLICKHOUSE_HOST=my-ch-host \
  -e CLICKHOUSE_DATABASE=my_db \
  carlino/clickhouse-viz:latest
```

---

## Features

- **Schema overview** — all databases, tables, and columns at a glance
- **Drag & drop** table cards freely on the canvas
- **Search** by table name, column name, or type
- **Database filter** — dropdown to focus on one database
- **View DDL** — double-click a card header or click "DDL ↗"
- **Key columns** — orange dot marks PRIMARY / SORTING KEY columns
- **Zoom** with mouse wheel or +/− buttons
- **Fit all** to center everything on screen
- **Reload** button to refresh the schema without restarting

### Keyboard shortcuts

| Key   | Action          |
|-------|-----------------|
| `+/-` | Zoom in/out     |
| `0`   | Fit all         |
| `f`   | Focus search    |
| `Esc` | Close DDL modal |

---

## API

The server exposes two endpoints for programmatic access:

| Endpoint       | Description                          |
|----------------|--------------------------------------|
| `GET /api/schema` | Full schema as JSON (tables + columns) |
| `GET /api/health` | ClickHouse connection health check  |

---

## Run without Docker

Requires Node.js 18+ (uses the built-in HTTP client — no `npm install` needed).

```bash
CLICKHOUSE_HOST=localhost node server.js
```

---

## License

MIT
