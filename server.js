const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = '31dd8ce7bbc6f81357f77bd708d55d066d5a8e9e';
const CLIENT_SECRET = '7082a944fa4a4e5776e0cee250bc9ae1fdbf229e62d09e0568774278efcb';
var REFRESH_TOKEN = 'd491254b481295bbf096a8a413f61c823a23ceec';
var accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpZCI6ImJmNTIwZjM3OTRjYTc3NjVlOWY3MTAxNDVjZTdmYmUzMTMzZmY4NzMiLCJqdGkiOiJiZjUyMGYzNzk0Y2E3NzY1ZTlmNzEwMTQ1Y2U3ZmJlMzEzM2ZmODczIiwiaXNzIjpudWxsLCJhdWQiOiIzMWRkOGNlN2JiYzZmODEzNTdmNzdiZDcwOGQ1NWQwNjZkNWE4ZTllIiwic3ViIjoiNTg4NTE4MDQ4OCIsImV4cCI6MTc5NTU0Njg3OCwiaWF0IjoxNzk1NTI1Mjc4LCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwic2NvcGUiOm51bGwsInBlcm0iOiIwYSIsImdyYW50VHlwZXMiOiJhdXRob3JpemF0aW9uX2NvZGUgcmVmcmVzaF90b2tlbiIsImFwcF9pZCI6IjM0Mjc4MCIsImNvbXBhbnlfaWQiOjU4ODUxODA0ODcsInJvbGUiOiJhZG0iLCJwbGFuX25hbWUiOiJQbGFub1RpdGFuaW9UaWVyMiIsImFwcHJvdmVkIjpmYWxzZX0.lMFRrVil9JpT2TVahqn4WZIm_xQQ-O3pT3gpByzoE0rZIqiEFpAeIPKwUnwvqJjYQ6LdHvnghfMkjiUKZJX_WGQxynkW_kbJDDm2ER5eBkXxto8NgYjr88IfbibnziOq_Ljl6wVn2guuCM2cLL59_h-tuUGJDtQarsXiF4rX_z1x3Sp4K6R7yPQPlZ1FbWHgndc3uKZPE384qGFqM20DToH3GZL44-L_xigMOvU2l5NqqWaUDN2-wnlp1ATgPPscwtKDBd_rswr3y7za_zTsTgeI1xsEveSvikKliFAojzaAsZ61VfQSBEtl_TeibqeQhyl2PhdYOBB1gacN8aeadw';
var tokenExpiry = Date.now() + (5 * 60 * 60 * 1000);

const ADMIN_SENHA = 'calcados24h';
const VENDEDORES_FILE = path.join(__dirname, 'vendedores.json');

var VENDEDORES_DEFAULT = {
  '15596884435': {nome: 'Carla', tipo: 'atacado'},
  '15596717991': {nome: 'Jardel', tipo: 'atacado'},
  '15596375893': {nome: 'Ana Karine', tipo: 'atacado'},
  '15596984953': {nome: 'Raquel', tipo: 'atacado'},
  '18527574538': {nome: 'Talison', tipo: 'atacado'},
  '10619057007': {nome: 'Lucas', tipo: 'varejo'},
  '15596933252': {nome: 'Ana Karollyne', tipo: 'varejo'},
  '15596868930': {nome: 'Dorathy', tipo: 'varejo'},
  '15596730913': {nome: 'Emilli', tipo: 'varejo'},
  '15596884243': {nome: 'Jessica', tipo: 'varejo'},
  '15596884245': {nome: 'Larissa', tipo: 'varejo'},
  '18510529769': {nome: 'Gisele', tipo: 'varejo'},
  '18526773049': {nome: 'Daianna', tipo: 'varejo'}
};

function carregarVendedores() {
  try {
    if (fs.existsSync(VENDEDORES_FILE)) {
      return JSON.parse(fs.readFileSync(VENDEDORES_FILE, 'utf8'));
    }
  } catch(e) {}
  return JSON.parse(JSON.stringify(VENDEDORES_DEFAULT));
}

function salvarVendedores(v) {
  try { fs.writeFileSync(VENDEDORES_FILE, JSON.stringify(v, null, 2)); } catch(e) {}
}

var vendedores = carregarVendedores();

function renewToken() {
  return new Promise(function(resolve, reject) {
    var creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
    var body = 'grant_type=refresh_token&refresh_token=' + REFRESH_TOKEN;
    var req = https.request({
      hostname: 'api.bling.com.br',
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
      res.on('end', function() {
        try {
          var json = JSON.parse(data);
          if (json.access_token) {
            accessToken = json.access_token;
            if (json.refresh_token) REFRESH_TOKEN = json.refresh_token;
            tokenExpiry = Date.now() + (5 * 60 * 60 * 1000);
            console.log('Token renovado!');
            resolve(accessToken);
          } else {
            console.error('Erro:', JSON.stringify(json));
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
  if (Date.now() > tokenExpiry - (30 * 60 * 1000)) {
    await renewToken();
  }
  return accessToken;
}

setInterval(function() { renewToken().catch(console.error); }, 5 * 60 * 60 * 1000);

function getBody(req) {
  return new Promise(function(resolve) {
    var data = '';
    req.on('data', function(chunk) { data += chunk; });
    req.on('end', function() {
      try { resolve(JSON.parse(data)); } catch(e) { resolve({}); }
    });
  });
}

var server = http.createServer(async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // TOKEN
  if (req.url === '/token' && req.method === 'GET') {
    try {
      var token = await getToken();
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({access_token: token}));
    } catch(e) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: String(e)}));
    }
    return;
  }

  // LISTAR VENDEDORES
  if (req.url === '/vendedores' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(vendedores));
    return;
  }

  // ADICIONAR VENDEDOR
  if (req.url === '/vendedores' && req.method === 'POST') {
    var body = await getBody(req);
    if (body.senha !== ADMIN_SENHA) {
      res.writeHead(401, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: 'Senha incorreta'}));
      return;
    }
    if (!body.id || !body.nome || !body.tipo) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: 'Campos obrigatorios: id, nome, tipo'}));
      return;
    }
    vendedores[String(body.id)] = {nome: body.nome, tipo: body.tipo};
    salvarVendedores(vendedores);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ok: true, vendedores: vendedores}));
    return;
  }

  // REMOVER VENDEDOR
  if (req.url.indexOf('/vendedores/') === 0 && req.method === 'DELETE') {
    var body = await getBody(req);
    if (body.senha !== ADMIN_SENHA) {
      res.writeHead(401, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: 'Senha incorreta'}));
      return;
    }
    var id = req.url.replace('/vendedores/', '');
    delete vendedores[id];
    salvarVendedores(vendedores);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ok: true, vendedores: vendedores}));
    return;
  }

  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({status: 'ok'}));
});

var PORT = process.env.PORT || 3000;
server.listen(PORT, function() { console.log('Server running on port ' + PORT); });
