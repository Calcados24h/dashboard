const https = require('https');
const http = require('http');

const CLIENT_ID = '31dd8ce7bbc6f81357f77bd708d55d066d5a8e9e';
const CLIENT_SECRET = '7082a944fa4a4e5776e0cee250bc9ae1fdbf229e62d09e0568774278efcb';
var REFRESH_TOKEN = 'eedad71728c6f7e4c98493e7834e4349a8ac3af0';
var accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpZCI6ImE3MTg0MWQ1ODM5YjQyOTg1ZjJkZmZlZWEyOWFjMjg1MDQ0NDZiMGQiLCJqdGkiOiJhNzE4NDFkNTgzOWI0Mjk4NWYyZGZmZWVhMjlhYzI4NTA0NDQ2YjBkIiwiaXNzIjpudWxsLCJhdWQiOiIzMWRkOGNlN2JiYzZmODEzNTdmNzdiZDcwOGQ1NWQwNjZkNWE4ZTllIiwic3ViIjoiNTg4NTE4MDQ4OCIsImV4cCI6MTc5NDUxNjg3OSwiaWF0IjoxNzk0NDk1Mjc5LCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwic2NvcGUiOm51bGwsInBlcm0iOiIwYSIsImdyYW50VHlwZXMiOiJhdXRob3JpemF0aW9uX2NvZGUgcmVmcmVzaF90b2tlbiIsImFwcF9pZCI6IjM0Mjc4MCIsImNvbXBhbnlfaWQiOjU4ODUxODA0ODcsInJvbGUiOiJhZG0iLCJwbGFuX25hbWUiOiJQbGFub1RpdGFuaW9UaWVyMiIsImFwcHJvdmVkIjpmYWxzZX0.V7-0oRZmmx1Og_D_V62rsHBzbQ8WqOEAwf2BHep2wNGUZCYGyip11e1dyS5qI7WcnzvbYic72s47m0ZS5ijErHXG-M-u_1q0v0zNYWrgMufSxJ8BiqPJgp3a5WkACYyXcwBqSak42e_8CHOJDjzxU5VHzRMJCxKQrN8RsH3Y3FKF6E9Hy5dM2utiZGoQ7xkGjmD3TgrCOaSYQM-Q5x_Idj3zVRVEZmDyl_BTZwHkq6du1z8ugc9Z2WzxFe_M8pTtFlqPWjOptPd0Y6oU4CLhpGptqTvWZC7QCyOxcXZ5QXUsfasRfYe1EwHZ4-A_mcy5zIi2hhcJcfgnaNqS1DT2Hg';
var tokenExpiry = Date.now() + (5 * 60 * 60 * 1000);

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
