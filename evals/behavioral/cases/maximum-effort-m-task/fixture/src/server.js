import { createServer as createHttpServer } from 'node:http';
import { login } from './auth.js';

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
  });
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

export function createServer() {
  return createHttpServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
    if (req.method === 'POST' && req.url === '/login') {
      let creds;
      try {
        creds = JSON.parse(await readBody(req));
      } catch {
        return send(res, 400, { error: 'invalid json' });
      }
      const token = login(creds.username, creds.password);
      if (!token) return send(res, 401, { error: 'invalid credentials' });
      return send(res, 200, { token });
    }
    send(res, 404, { error: 'not found' });
  });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const server = createServer();
  server.listen(Number(process.env.PORT) || 3000, () => {
    console.log(`listening on ${server.address().port}`);
  });
}
