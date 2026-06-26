module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = req.headers.authorization || '';
    const { path, ...params } = req.query;
    const endpoint = decodeURIComponent(path || '');
    
    // Reconstrói query string com params adicionais
    const qs = new URLSearchParams(params).toString();
    const url = 'https://www.bling.com.br/Api/v3/' + endpoint + (qs ? '?' + qs : '');

    const headers = { 'Authorization': token, 'Accept': 'application/json' };
    
    let body;
    if (req.method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = typeof req.body === 'string' ? req.body : new URLSearchParams(req.body||{}).toString();
    }

    const resp = await fetch(url, { method: req.method, headers, body });
    const data = await resp.json().catch(() => ({}));
    return res.status(resp.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
