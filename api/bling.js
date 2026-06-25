export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = req.headers.authorization || '';
    
    // Reconstrói a URL do Bling a partir de TODOS os query params
    // req.query contém: { path: 'pedidos/vendas', pagina: '1', limite: '100', ... }
    const { path, ...rest } = req.query;
    const decodedPath = decodeURIComponent(path || '');
    
    // Monta query string com os parâmetros restantes
    const queryString = Object.entries(rest)
      .map(([k, v]) => ${k}=${encodeURIComponent(v)})
      .join('&');
    
    const url = 'https://www.bling.com.br/Api/v3/' + decodedPath + (queryString ? '?' + queryString : '');

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
      return res.status(resp.status).json(JSON.parse(text));
    } catch {
      return res.status(resp.status).send(text);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
