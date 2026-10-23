// Minimal stand-in for a CRM/automation webhook used by the e2e tests.
// Returns 500 when the payload contains "simulate-failure"; otherwise 200.
import http from 'node:http';

const port = Number(process.argv[2] ?? 3299);
const received = [];

http
  .createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') return res.end('ok');
    if (req.method === 'GET' && req.url === '/received') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(received));
    }
    if (req.method === 'POST' && req.url === '/hook') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const parsed = JSON.parse(body);
        received.push({ id: parsed.id, company: parsed.request.company, signed: Boolean(req.headers['x-avyntro-signature']) });
        res.statusCode = body.includes('simulate-failure') ? 500 : 200;
        res.end();
      });
      return;
    }
    res.statusCode = 404;
    res.end();
  })
  .listen(port, '127.0.0.1');
