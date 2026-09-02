const https = require('https');
const http = require('http');

const CLIENT_ID = '31dd8ce7bbc6f81357f77bd708d55d066d5a8e9e';
const CLIENT_SECRET = '7082a944fa4a4e5776e0cee250bc9ae1fdbf229e62d09e0568774278efcb';
const INITIAL_REFRESH = 'd7cc713c5278dada237b3fe9c4d266037cbc9d8a';

function fetchUrl(urlStr, options) {
  return new Promise(function(resolve, reject) {
    var mod = urlStr.startsWith('https') ? https : http;
    var urlObj = new URL(urlStr);
    var req = mod.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() { resolve(data); });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function kvGet(key) {
  var url = process.env.BLING_KV_REST_API_URL;
  var token = process.env.BLING_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    var res = await fetchUrl(url + '/get/' + key, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    var data = JSON.parse(res);
    return data.result || null;
  } catch(e) { return null; }
}

async function kvSet(key, value, exSeconds) {
  var url = process.env.BLING_KV_REST_API_URL;
  var token = process.env.BLING_KV_REST_API_TOKEN;
  if (!url || !token) return;
  try {
    var path = '/set/' + key + '/' + encodeURIComponent(value);
    if (exSeconds) path += '?ex=' + exSeconds;
    await fetchUrl(url + path, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
  } catch(e) { console.error('KV set error:', e.message); }
}

var accessToken = '';
var refreshToken = '';
var tokenExpiry = 0;

async function renewToken() {
  var rt = refreshToken || await kvGet('bling_refresh_token') || INITIAL_REFRESH;
  var creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
  var body = 'grant_type=refresh_token&refresh_token=' + rt;

  return new Promise(function(resolve, reject) {
    var req = https.request({
      hostname: 'www.bling.com.br',
      path: '/Api/v3/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + creds,
        'Content-Length': Buffer.byteLength(body)
      }
    }, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', async function() {
        try {
          var json = JSON.parse(data);
          if (json.access_token) {
            accessToken = json.access_token;
            refreshToken = json.refresh_token || rt;
            tokenExpiry = Date.now() + (5 * 60 * 60 * 1000);
            await kvSet('bling_access_token', accessToken, 19800);
            await kvSet('bling_refresh_token', refreshToken);
            console.log('Token renovado e salvo no KV!');
            resolve(accessToken);
          } else {
            console.error('Erro renovar:', JSON.stringify(json));
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
  if (!accessToken || Date.now() > tokenExpiry - (30 * 60 * 1000)) {
    var saved = await kvGet('bling_access_token');
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

setInterval(function() { renewToken().catch(console.error); }, 5 * 60 * 60 * 1000);

// Força renovação limpando o KV ao iniciar
async function iniciar() {
  await kvSet('bling_access_token', '', 1); // limpa token salvo
  await renewToken();
  console.log('Token inicial renovado!');
}
iniciar().catch(console.error);

var server = http.createServer(async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.url === '/token') {
    try {
      var token = await getToken();
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

var PORT = process.env.PORT || 3000;
server.listen(PORT, function() { console.log('Server running on port ' + PORT); });
