export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const path = req.query.path || '';
    const token = req.headers.authorization || '';
    const baseUrl = 'https://www.bling.com.br/Api/v3/';
    const url = baseUrl + decodeURIComponent(path);
    
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': token,
        'Accept': 'application/json',
      }
    };

    if (req.method === 'POST') {
      fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const body = Object.entries(req.body||{}).map(([k,v])=>${k}=${encodeURIComponent(v)}).join('&');
      fetchOptions.body = body;
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
