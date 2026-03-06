// Proxy toys from Supabase so old Android WebView app (TOYFLIX-APP user agent)
// gets data via our server instead of direct Supabase calls that get blocked.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wucwpyitzqjukcphczhr.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_FSkXrLtW_fYLLGipAoq1Hw_ltq5Ij-J';

module.exports = async function (context, req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: cors };
    return;
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/toys?category=neq.ride_on_toys&select=*&order=is_featured.desc&order=name.asc`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      context.res = {
        status: 502,
        headers: cors,
        body: JSON.stringify({ error: 'Supabase error', status: res.status, detail: text.slice(0, 200) }),
      };
      return;
    }

    const data = await res.json();
    context.res = {
      status: 200,
      headers: cors,
      body: JSON.stringify(data),
    };
  } catch (err) {
    context.res = {
      status: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message || 'Proxy error' }),
    };
  }
};
