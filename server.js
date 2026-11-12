const https = require('https');
const http = require('http');

const CLIENT_ID = '31dd8ce7bbc6f81357f77bd708d55d066d5a8e9e';
const CLIENT_SECRET = '7082a944fa4a4e5776e0cee250bc9ae1fdbf229e62d09e0568774278efcb';
var REFRESH_TOKEN = 'abd4f813963482462332c43db42a143f9a1f85ef';
var accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpZCI6ImFlZDU5M2YxOWZmM2JiMjk3M2E4MjMxODE3Nzk4N2JjMmFlMGY4OTYiLCJqdGkiOiJhZWQ1OTNmMTlmZjNiYjI5NzNhODIzMTgxNzc5ODdiYzJhZTBmODk2IiwiaXNzIjpudWxsLCJhdWQiOiIzMWRkOGNlN2JiYzZmODEzNTdmNzdiZDcwOGQ1NWQwNjZkNWE4ZTllIiwic3ViIjoiNTg4NTE4MDQ4OCIsImV4cCI6MTc5NDQ1NDk4OCwiaWF0IjoxNzk0NDMzMzg4LCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwic2NvcGUiOm51bGwsInBlcm0iOiIwYSIsImdyYW50VHlwZXMiOiJhdXRob3JpemF0aW9uX2NvZGUgcmVmcmVzaF90b2tlbiIsImFwcF9pZCI6IjM0Mjc4MCIsImNvbXBhbnlfaWQiOjU4ODUxODA0ODcsInJvbGUiOiJhZG0iLCJwbGFuX25hbWUiOiJQbGFub1RpdGFuaW9UaWVyMiIsImFwcHJvdmVkIjpmYWxzZX0.J-97BJqHK1VjrrLBTRfxQPoxrnTQjNtvLHYt-f2psmwOLPVoo_XsUMNwwsf6pt6jm1g8iCwTzvPelZ4kvGYT2qcZvonIkdkDzafRAv6T6BGqYqfpNE4hJZRqIeUJdCy1ONzED4RD_hVfAu_nQZHdVJxSt-e4d9oXXsw9M-9or-ZsjwkJ6MYKjG64_Z01BGoS61YtvZSClsbPmZprYbPSSF7tsPSs_T8-uHAx6VALcRaQ9ooRJtzlHTjqurZd5FgjDVEfBHkDMZXzpO9SVzcn8ut-iDCz8hpy4ESkxbmlDph6z8SQCxaYc6pDC-ZcSDSWbPuggZqKcFsa6yM6HrK6Xg';
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
