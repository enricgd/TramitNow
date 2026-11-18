// Página de preguntas abiertas (por ejemplo, las de la fase 7) para que las conteste quien corresponda.
// Sin dependencias ni base de datos: cada respuesta es una línea de un fichero JSONL y nunca se borra
// (contestar otra vez añade otra línea; la página muestra la última y el historial).
//
// Uso:  node server.js   (PORT=3000, DATA_FILE=/data/respuestas.jsonl)
// Caddy publica /preguntasTorre/* en ejemplo.{DOMAIN} (infra/nas/caddy/Caddyfile).

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BASE = '/preguntasTorre';
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = process.env.DATA_FILE || '/data/respuestas.jsonl';
const MAX_DATA_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = 16 * 1024;

const leer = (f) => fs.readFileSync(path.join(__dirname, f));
const preguntas = () => JSON.parse(leer('preguntas.json'));

function respuestas() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return fs
    .readFileSync(DATA_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap((linea) => {
      try {
        return [JSON.parse(linea)];
      } catch {
        return [];
      }
    });
}

function enviar(res, status, cuerpo, tipo = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': tipo,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
  });
  res.end(typeof cuerpo === 'string' || Buffer.isBuffer(cuerpo) ? cuerpo : JSON.stringify(cuerpo));
}

function texto(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function guardar(req, res) {
  let tam = 0;
  const trozos = [];
  req.on('data', (t) => {
    tam += t.length;
    if (tam > MAX_BODY_BYTES) req.destroy();
    else trozos.push(t);
  });
  req.on('end', () => {
    let cuerpo;
    try {
      cuerpo = JSON.parse(Buffer.concat(trozos).toString('utf8'));
    } catch {
      return enviar(res, 400, { error: 'JSON no válido' });
    }
    const pregunta = preguntas().preguntas.find((p) => p.id === cuerpo.preguntaId);
    if (!pregunta) return enviar(res, 400, { error: 'Pregunta desconocida' });
    const opciones = new Set([...pregunta.opciones.map((o) => o.id), 'otra', 'aplazar']);
    const registro = {
      id: crypto.randomUUID(),
      preguntaId: pregunta.id,
      opcion: texto(cuerpo.opcion, 40),
      comentario: texto(cuerpo.comentario, 4000),
      nombre: texto(cuerpo.nombre, 80),
      fecha: new Date().toISOString(),
    };
    if (!opciones.has(registro.opcion)) return enviar(res, 400, { error: 'Opción desconocida' });
    if (!registro.nombre) return enviar(res, 400, { error: 'Falta el nombre' });
    if (registro.opcion === 'otra' && !registro.comentario)
      return enviar(res, 400, { error: 'Escribe la respuesta' });
    if (fs.existsSync(DATA_FILE) && fs.statSync(DATA_FILE).size > MAX_DATA_BYTES)
      return enviar(res, 507, { error: 'No queda espacio para más respuestas' });
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.appendFileSync(DATA_FILE, JSON.stringify(registro) + '\n');
    enviar(res, 201, registro);
  });
}

http
  .createServer((req, res) => {
    const ruta = new URL(req.url, 'http://x').pathname;
    try {
      // /preguntasTorre, /preguntastorre/... → /preguntasTorre/ (la página usa rutas relativas)
      if (ruta === BASE || (!ruta.startsWith(BASE) && ruta.toLowerCase().startsWith(BASE.toLowerCase()))) {
        res.writeHead(301, { Location: BASE + '/' });
        return res.end();
      }
      if (ruta === BASE + '/' && req.method === 'GET')
        return enviar(res, 200, leer('index.html'), 'text/html; charset=utf-8');
      if (ruta === BASE + '/api/preguntas' && req.method === 'GET') return enviar(res, 200, preguntas());
      if (ruta === BASE + '/api/respuestas' && req.method === 'GET') return enviar(res, 200, respuestas());
      if (ruta === BASE + '/api/respuestas' && req.method === 'POST') return guardar(req, res);
      enviar(res, 404, { error: 'No encontrado' });
    } catch (e) {
      console.error(e);
      enviar(res, 500, { error: 'Error interno' });
    }
  })
  .listen(PORT, () => console.log(`Preguntas en :${PORT}${BASE}/ (datos en ${DATA_FILE})`));
