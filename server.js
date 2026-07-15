const https = require('https');
const http = require('http');

const CLIENT_ID = '31dd8ce7bbc6f81357f77bd708d55d066d5a8e9e';
const CLIENT_SECRET = '7082a944fa4a4e5776e0cee250bc9ae1fdbf229e62d09e0568774278efcb';
let refreshToken = '7c14b293f90c5d10c88705a58a81ab36b6f545da';
let accessToken = '56d5e6e03a082b1c7905d9a86133cc1df5a75b96';
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
            console.log('Token renovado com sucesso! Expira em 5h.');
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
  // Sempre renova se faltam menos de 30 min para expirar
  if (!accessToken || Date.now() > tokenExpiry - (30 * 60 * 1000)) {
    await renewToken();
  }
  return accessToken;
}

// Renova a cada 5 horas
setInterval(() => renewToken().catch(console.error), 5 * 60 * 60 * 1000);

// Renova imediatamente ao iniciar
renewToken().then(() => {
  console.log('Token inicial obtido com sucesso!');
}).catch(e => {
  console.error('Erro no token inicial:', e);
});

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
  res.end(JSON.stringify({ status: 'ok', tokenValid: Date.now() < tokenExpiry }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));
