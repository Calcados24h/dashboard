const https = require('https');
const http = require('http');

const CLIENT_ID = '31dd8ce7bbc6f81357f77bd708d55d066d5a8e9e';
const CLIENT_SECRET = '7082a944fa4a4e5776e0cee250bc9ae1fdbf229e62d09e0568774278efcb';
let refreshToken = 'f5967736b424f2fc6035409377821748813e59e2';
let accessToken = '26bc5aeacf575e7f6c3d81d85cfbfecf63b50daf';
let tokenExpiry = Date.now() + (5 * 60 * 60 * 1000);

function renewToken() {
  return new Promise((resolve, reject) => {
    const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
    const body = 'grant_type=refresh_token&refresh_token=' + refreshToken;

    const req = https.request({
      hostname: 'www.bling.com.br',
      path: '/Api/v3/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + creds,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) {
            accessToken = json.access_token;
            if (json.refresh_token) refreshToken = json.refresh_token;
            tokenExpiry = Date.now() + (5 * 60 * 60 * 1000);
            console.log('Token renovado com sucesso!');
            resolve(accessToken);
          } else {
            console.error('Erro ao renovar:', JSON.stringify(json));
            reject(json);
          }
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getToken() {
  if (!accessToken || Date.now() > tokenExpiry) {
    await renewToken();
  }
  return accessToken;
}

setInterval(() => renewToken().catch(console.error), 5 * 60 * 60 * 1000);

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.url === '/token') {
    try {
      const token = await getToken();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: token }));
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));
