export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const path = decodeURIComponent(req.query.path || '');
    const token = req.headers.authorization || '';
    const url = 'https://www.bling.com.br/Api/v3/' + path;

    const headers = {
      'Authorization': token,
      'Accept': 'application/json',
    };

    let body = undefined;
    if (req.method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const raw = req.body;
      if (typeof raw === 'string') body = raw;
      else if (typeof raw === 'object') body = new URLSearchParams(raw).toString();
    }

    const resp = await fetch(url, { method: req.method, headers, body });
    const text = await resp.text();
    
    try {
      const json = JSON.parse(text);
      return res.status(resp.status).json(json);
    } catch {
      return res.status(resp.status).send(text);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
