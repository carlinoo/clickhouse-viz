'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Defaults (env vars or fixed values) ─────────────────────────────────────
const CONFIG = {
  host:       process.env.CLICKHOUSE_HOST     || 'localhost',
  port:       parseInt(process.env.CLICKHOUSE_PORT || '8123'),
  user:       process.env.CLICKHOUSE_USER     || 'default',
  password:   process.env.CLICKHOUSE_PASSWORD || '',
  serverPort: parseInt(process.env.PORT       || '63721'),
  useHttps:   process.env.CLICKHOUSE_HTTPS    === 'true',
};

// Merges frontend overrides with server defaults
function mergeConfig(overrides = {}) {
  return {
    host:     (overrides.host     && overrides.host.trim())     || CONFIG.host,
    port:     parseInt(overrides.port                           || CONFIG.port),
    user:     (overrides.user     && overrides.user.trim())     || CONFIG.user,
    password: (overrides.password !== undefined)                 ? overrides.password : CONFIG.password,
    useHttps: overrides.useHttps === 'true'                     || CONFIG.useHttps,
  };
}

// ── ClickHouse HTTP client ────────────────────────────────────────────────────
function queryClickHouse(sql, cfg) {
  cfg = cfg || CONFIG;
  return new Promise((resolve, reject) => {
    const body      = Buffer.from(sql, 'utf8');
    const transport = cfg.useHttps ? https : http;

    const options = {
      hostname: cfg.host,
      port:     cfg.port,
      path:     '/',
      method:   'POST',
      headers: {
        'Content-Type':        'text/plain; charset=utf-8',
        'Content-Length':      body.length,
        'X-ClickHouse-User':   cfg.user,
        'X-ClickHouse-Key':    cfg.password,
        'X-ClickHouse-Format': 'JSONCompact',
      },
    };

    const req = transport.request(options, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200)
          return reject(new Error(`ClickHouse ${res.statusCode}: ${data.slice(0, 300)}`));
        try   { resolve(JSON.parse(data)); }
        catch { reject(new Error('JSON parse error: ' + data.slice(0, 200))); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Queries ───────────────────────────────────────────────────────────────────
const SYSTEM_DBS = `('system','information_schema','INFORMATION_SCHEMA')`;

async function getDatabases(cfg) {
  const r = await queryClickHouse(
    `SELECT name FROM system.databases WHERE name NOT IN ${SYSTEM_DBS} ORDER BY name FORMAT JSONCompact`,
    cfg
  );
  return (r.data || []).map(row => row[0]);
}

async function getTablesForDB(db, cfg) {
  const safe = db.replace(/'/g, "\\'");
  const r = await queryClickHouse(`
    SELECT database, name, engine, create_table_query,
           toUInt64(total_rows) AS total_rows,
           formatReadableSize(total_bytes) AS total_bytes,
           is_temporary
    FROM system.tables
    WHERE database = '${safe}' AND name NOT LIKE '.%'
    ORDER BY name FORMAT JSONCompact
  `, cfg);
  return r.data || [];
}

async function getColumnsForDB(db, cfg) {
  const safe = db.replace(/'/g, "\\'");
  const r = await queryClickHouse(`
    SELECT table, name, type,
           is_in_primary_key, is_in_sorting_key, is_in_partition_key,
           default_kind, comment
    FROM system.columns
    WHERE database = '${safe}'
    ORDER BY table, position FORMAT JSONCompact
  `, cfg);
  return r.data || [];
}

async function buildSchema(database, cfg) {
  const [tablesRaw, colsRaw] = await Promise.all([
    getTablesForDB(database, cfg),
    getColumnsForDB(database, cfg),
  ]);

  const colsByTable = {};
  for (const [tbl, name, type, inPK, inSort, inPart, defKind, comment] of colsRaw) {
    if (!colsByTable[tbl]) colsByTable[tbl] = [];
    colsByTable[tbl].push({
      name, type,
      pk:           inPK   === 1 || inPK   === '1',
      sortingKey:   inSort  === 1 || inSort  === '1',
      partitionKey: inPart  === 1 || inPart  === '1',
      nullable:     type.startsWith('Nullable('),
      defaultKind:  defKind,
      comment:      comment || '',
    });
  }

  const tables = tablesRaw.map(([db, name, engine, ddl, totalRows, totalBytes, isTemp]) => ({
    db, name, engine, ddl,
    totalRows: Number(totalRows),
    totalBytes,
    isTemp: isTemp === 1 || isTemp === '1',
    fields: colsByTable[name] || [],
  }));

  return { database, tables, fetchedAt: new Date().toISOString() };
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed   = new URL(req.url, 'http://localhost');
  const pathname = parsed.pathname;
  const query    = Object.fromEntries(parsed.searchParams);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const json = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };

  // GET /api/config — returns server defaults (without password)
  if (pathname === '/api/config') {
    return json(200, { host: CONFIG.host, port: CONFIG.port, user: CONFIG.user, useHttps: CONFIG.useHttps });
  }

  // GET /api/databases[?host=&port=&user=&password=]
  if (pathname === '/api/databases') {
    try {
      const databases = await getDatabases(mergeConfig(query));
      return json(200, { databases });
    } catch (err) {
      console.error('[databases]', err.message);
      return json(500, { error: err.message });
    }
  }

  // GET /api/schema?database=xxx[&host=&port=&user=&password=]
  if (pathname === '/api/schema') {
    if (!query.database) return json(400, { error: 'Parameter "database" required' });
    try {
      const schema = await buildSchema(query.database, mergeConfig(query));
      return json(200, schema);
    } catch (err) {
      console.error('[schema]', err.message);
      return json(500, { error: err.message });
    }
  }

  // GET /api/health[?host=&port=&user=&password=]
  if (pathname === '/api/health') {
    try {
      const cfg = mergeConfig(query);
      await queryClickHouse('SELECT 1 FORMAT JSONCompact', cfg);
      return json(200, { ok: true, clickhouse: `${cfg.host}:${cfg.port}` });
    } catch (err) {
      return json(503, { ok: false, error: err.message });
    }
  }

  // Frontend
  if (pathname === '/' || pathname === '/index.html') {
    const htmlPath = path.join(__dirname, 'index.html');
    if (!fs.existsSync(htmlPath)) { res.writeHead(404); return res.end('index.html not found'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(htmlPath));
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(CONFIG.serverPort, () => {
  console.log(`\n✓ ClickHouse Schema Visualizer`);
  console.log(`  URL:        http://localhost:${CONFIG.serverPort}`);
  console.log(`  ClickHouse: ${CONFIG.host}:${CONFIG.port}`);
  console.log(`  User:       ${CONFIG.user}`);
  console.log(`\n  Config override: env variables or ⚙ panel in the UI.\n`);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE')
    console.error(`\n✗ Port ${CONFIG.serverPort} in use. Try: PORT=3001 node server.js`);
  else
    console.error('Server error:', err);
  process.exit(1);
});
