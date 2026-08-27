import { createServer as createHttpServer } from 'node:http';
import { healthStatus } from './service.js';

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

export function createServer() {
  return createHttpServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, healthStatus());
    send(res, 404, { error: 'not found' });
  });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const server = createServer();
  server.listen(Number(process.env.PORT) || 3000, () => {
    console.log(`listening on ${server.address().port}`);
  });
}
