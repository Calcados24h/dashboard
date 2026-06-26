const CLIENT_ID     = '31dd8ce7bbc6f81357f77bd708d55d066d5a8e9e';
const CLIENT_SECRET = '7082a944fa4a4e5776e0cee250bc9ae1fdbf229e62d09e0568774116fc28a6b';
const INITIAL_REFRESH = '427783690a188b31ce5efe98ebdf09a6ceec2124';

async function kvGet(url, token, key) {
  const r = await fetch(${url}/get/${key}, {
    headers: { Authorization: Bearer ${token} }
  });
  const d = await r.json();
  return d.result || null;
}

async function kvSet(url, token, key, value, ex) {
  const endpoint = ex ? ${url}/set/${key}/${encodeURIComponent(value)}?ex=${ex} : ${url}/set/${key}/${encodeURIComponent(value)};
  await fetch(endpoint, { headers: { Authorization: Bearer ${token} } });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const kvUrl   = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    let accessToken  = await kvGet(kvUrl, kvToken, 'bling_access_token');
    let refreshToken = await kvGet(kvUrl, kvToken, 'bling_refresh_token') || INITIAL_REFRESH;

    if (!accessToken) {
      const creds = Buffer.from(${CLIENT_ID}:${CLIENT_SECRET}).toString('base64');
      const resp = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': Basic ${creds}
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }).toString()
      });

      const data = await resp.json();

      if (data.access_token) {
        accessToken = data.access_token;
        await kvSet(kvUrl, kvToken, 'bling_access_token', accessToken, 19800);
        if (data.refresh_token) {
          await kvSet(kvUrl, kvToken, 'bling_refresh_token', data.refresh_token);
        }
      } else {
        return res.status(401).json({ error: 'Falha ao renovar token', details: data });
      }
    }

    return res.status(200).json({ access_token: accessToken });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
