// Vercel Serverless Function — GitHub Data Proxy (Cache-Free)
const GH_OWNER = 'galalemad75-creator';
const GH_REPO = 'milk-matsuri';
const GH_BRANCH = 'main';
const GH_FILE = 'data.json';

function getToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}
function headers() {
  return {
    'Authorization': `Bearer ${getToken()}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    try {
      const resp = await fetch(apiUrl + '?ref=' + GH_BRANCH, { headers: headers(), cache: 'no-store' });
      if (!resp.ok) throw new Error('GitHub read failed');
      const info = await resp.json();
      const data = JSON.parse(Buffer.from(info.content, 'base64').toString('utf8'));
      return res.status(200).json(data);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === 'POST') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    try {
      const { data } = req.body;
      if (!data) return res.status(400).json({ error: 'No data' });
      let sha = null;
      try {
        const check = await fetch(apiUrl + '?ref=' + GH_BRANCH, { headers: headers(), cache: 'no-store' });
        if (check.ok) sha = (await check.json()).sha;
      } catch {}
      const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
      const body = { message: 'Update data', content, branch: GH_BRANCH };
      if (sha) body.sha = sha;
      const resp = await fetch(apiUrl, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
      if (!resp.ok) { const err = await resp.json(); throw new Error(err.message || 'Write failed'); }
      return res.status(200).json({ ok: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }
  return res.status(405).json({ error: 'Not allowed' });
};
