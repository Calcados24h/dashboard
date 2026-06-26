const CLIENT_ID = '31dd8ce7bbc6f81357f77bd708d55d066d5a8e9e';
const CLIENT_SECRET = '7082a944fa4a4e5776e0cee250bc9ae1fdbf229e62d09e0568774278efcb';
const INITIAL_REFRESH = '427783690a188b31ce5efe98ebdf09a6ceec2124';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const creds = Buffer.from(${CLIENT_ID}:${CLIENT_SECRET}).toString('base64');
    
    const r = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': Basic ${creds}
      },
      body: grant_type=refresh_token&refresh_token=${INITIAL_REFRESH}
    });

    const data = await r.json();

    if (data.access_token) {
      return res.status(200).json({ access_token: data.access_token });
    }

    return res.status(401).json({ error: 'Falha', details: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
