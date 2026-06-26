const CLIENT_ID = '31dd8ce7bbc6f81357f77bd708d55d066d5a8e9e';
const CLIENT_SECRET = '7082a944fa4a4e5776e0cee250bc9ae1fdbf229e62d09e0568774278efcb';
const INITIAL_REFRESH = '427783690a188b31ce5efe98ebdf09a6ceec2124';

async function kvRequest(path) {
  const base = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const r = await fetch(new URL(path, base).href, {
    headers: { Authorization: Bearer ${token} }
  });
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Testa se variáveis existem
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    if (!kvUrl || !kvToken) {
      return res.status(500).json({ error: 'KV não configurado', kvUrl: !!kvUrl, kvToken: !!kvToken });
    }

    // Busca access token
    const r1 = await fetch(${kvUrl}/get/bling_access_token, {
      headers: { Authorization: Bearer ${kvToken} }
    });
    const d1 = await r1.json();
    let accessToken = d1.result;

    if (!accessToken) {
      // Busca refresh token
      const r2 = await fetch(${kvUrl}/get/bling_refresh_token, {
        headers: { Authorization: Bearer ${kvToken} }
      });
      const d2 = await r2.json();
      const refreshToken = d2.result || INITIAL_REFRESH;

      // Renova
      const creds = Buffer.from(${CLIENT_ID}:${CLIENT_SECRET}).toString('base64');
      const r3 = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': Basic ${creds}
        },
        body: grant_type=refresh_token&refresh_token=${refreshToken}
      });
      const d3 = await r3.json();

      if (!d3.access_token) {
        return res.status(401).json({ error: 'Falha ao renovar', bling: d3 });
      }

      accessToken = d3.access_token;

      // Salva tokens
      await fetch(${kvUrl}/set/bling_access_token, {
        method: 'POST',
        headers: { Authorization: Bearer ${kvToken}, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: accessToken, ex: 19800 })
      });

      if (d3.refresh_token) {
        await fetch(${kvUrl}/set/bling_refresh_token, {
          method: 'POST',
          headers: { Authorization: Bearer ${kvToken}, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: d3.refresh_token })
        });
      }
    }

    return res.status(200).json({ access_token: accessToken });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
