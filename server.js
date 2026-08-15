const https = require('https');
const http = require('http');

const CLIENT_ID = '31dd8ce7bbc6f81357f77bd708d55d066d5a8e9e';
const CLIENT_SECRET = '7082a944fa4a4e5776e0cee250bc9ae1fdbf229e62d09e0568774278efcb';
const INITIAL_REFRESH = '1f49f39d3864f0fda73a7fd12ddb745dcb67a0c8';

// KV helpers usando REST API do Upstash
async function kvGet(key) {
  const url = process.env.BLING_KV_REST_API_URL;
  const token = process.env.BLING_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetchHttp(url + "/get/" + key, { headers: { Authorization: "Bearer " + token } });
    const data = JSON.parse(res);
    return data.result || null;
  } catch(e) { return null; }
}

async function kvSet(key, value, exSeconds) {
  const url = process.env.BLING_KV_REST_API_URL;
  const token = process.env.BLING_KV_REST_API_TOKEN;
  if (!url || !token) return;
  try {
    const path = exSeconds ? "/set/" + key + "/" + encodeURIComponent(value) + "?ex=" + exSeconds : "/set/" + key + "/" + encodeURIComponent(value);
    await fetchHttp(url + path, { headers: { Authorization: "Bearer " + token } });
  } catch(e) {}
}

function fetchHttp(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = urlStr.startsWith('https') ? https : http;
    const urlObj = new URL(urlStr);
    const req = mod.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

let accessToken = '';
let refreshToken = '';
let tokenExpiry = 0;

async function renewToken() {
  const rt = refreshToken || await kvGet('bling_refresh_token') || INITIAL_REFRESH;
  const creds = Buffer.from(${CLIENT_ID}:${CLIENT_SECRET}).toString('base64');
  const body = grant_type=refresh_token&refresh_token=${rt};

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.bling.com.br',
      path: '/Api/v3/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': Basic ${creds},
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) {
            accessToken = json.access_token;
            refreshToken = json.refresh_token || rt;
            tokenExpiry = Date.now() + (5 * 60 * 60 * 1000);
            // Salva no KV
            await kvSet('bling_access_token', accessToken, 19800);
            await kvSet('bling_refresh_token', refreshToken);
            console.log('Token renovado e salvo no KV!');
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
  // Tenta buscar do KV primeiro
  if (!accessToken || Date.now() > tokenExpiry - (30 * 60 * 1000)) {
    const saved = await kvGet('bling_access_token');
    if (saved) {
      accessToken = saved;
      tokenExpiry = Date.now() + (5 * 60 * 60 * 1000);
      console.log('Token recuperado do KV!');
    } else {
      await renewToken();
    }
  }
  return accessToken;
}

// Renova a cada 5 horas
setInterval(() => renewToken().catch(console.error), 5 * 60 * 60 * 1000);

// Inicializa
getToken().then(t => console.log('Token inicial OK:', t.substring(0,10)+'...')).catch(console.error);

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
