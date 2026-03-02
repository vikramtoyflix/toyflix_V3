#!/usr/bin/env node
/**
 * Smoke test: fetch main URLs and check status + basic content.
 * No browser required. Run: node scripts/smoke-test-urls.js
 * Or against production: BASE_URL=https://toyflix.in node scripts/smoke-test-urls.js
 */
const BASE = process.env.BASE_URL || 'http://localhost:5173';

const tests = [
  { url: '/', name: 'H1 Homepage', expectInBody: ['ToyJoy', 'Toyflix', 'toys', 'Rent', 'Explore'] },
  { url: '/toys', name: 'T1 Toys page', expectInBody: ['Premium', 'Ride-On', 'Toys', 'catalog'] },
  { url: '/pricing', name: 'P1 Pricing', expectInBody: ['pricing', 'subscription', 'plan', 'Simple', 'smarter'] },
  { url: '/auth', name: 'A1 Auth page', expectInBody: ['phone', 'OTP', 'Login', 'Sign', 'auth'] },
  { url: '/about', name: 'H5 About', expectInBody: ['About', 'Toyflix', 'play'] },
  { url: '/dashboard', name: 'D1 Dashboard', expectInBody: ['Dashboard', 'Sign in', 'Login', 'Session', 'Error', 'root', 'id="root"'] },
  { url: '/nonexistent-xyz-404', name: 'E4 404', expectInBody: ['404', 'not found', 'Oops', 'Return to Home', 'root'] },
];

async function fetchText(url) {
  const full = url.startsWith('http') ? url : `${BASE.replace(/\/$/, '')}${url.startsWith('/') ? url : '/' + url}`;
  const res = await fetch(full, { redirect: 'follow', headers: { 'User-Agent': 'SmokeTest/1.0' } });
  const text = await res.text();
  return { status: res.status, url: res.url, text };
}

function checkBody(text, expectInBody) {
  const lower = text.toLowerCase();
  const found = expectInBody.filter((phrase) => lower.includes(phrase.toLowerCase()));
  return { found, missing: expectInBody.filter((p) => !lower.includes(p.toLowerCase())) };
}

async function main() {
  console.log('Smoke test base URL:', BASE);
  console.log('---');
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const t of tests) {
    try {
      const { status, url, text } = await fetchText(t.url);
      const { found, missing } = checkBody(text, t.expectInBody);
      const ok = status === 200 && found.length >= 1;
      if (ok) {
        passed++;
        results.push({ name: t.name, status: 'P', statusCode: status, note: `found: ${found.slice(0, 3).join(', ')}` });
        console.log(`  ✅ ${t.name} – ${status} – found: ${found.slice(0, 3).join(', ')}`);
      } else {
        failed++;
        const reason = status !== 200 ? `status ${status}` : `expected one of: ${t.expectInBody.join(', ')}`;
        results.push({ name: t.name, status: 'F', statusCode: status, note: reason });
        console.log(`  ❌ ${t.name} – ${status} – ${reason}`);
      }
    } catch (e) {
      failed++;
      results.push({ name: t.name, status: 'F', note: e.message });
      console.log(`  ❌ ${t.name} – Error: ${e.message}`);
    }
  }

  console.log('---');
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (process.env.OUTPUT_JSON) {
    const fs = await import('fs');
    fs.writeFileSync(process.env.OUTPUT_JSON, JSON.stringify({ base: BASE, passed, failed, results }, null, 2));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
