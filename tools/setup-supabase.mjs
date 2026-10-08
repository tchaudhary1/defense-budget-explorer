// One-time Supabase setup for the hosted Defense Budget Explorer.
//
// Creates the private `data` bucket, the read policy for signed-in users, uploads the data files,
// disables public sign-ups, sets the site URL, and invites the demo account by email.
// Safe to re-run: existing objects are overwritten, the policy is replaced, an existing user is left alone.
//
// Environment (never commit these; inject them, e.g. via `sonegi-secret run --`):
//   SUPABASE_URL                 https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    the project's service_role (secret) key
//   SUPABASE_ACCESS_TOKEN        a personal access token that can manage THIS project (for auth settings + SQL)
//   DEMO_EMAIL                   the demo account's email (an invite with a set-password link is sent)
//   SITE_URL                     defaults to https://tchaudhary1.github.io/defense-budget-explorer/
//   DEMO_PASSWORD (optional)     if set, the account is created ready to use and no email is sent
//
//   node tools/setup-supabase.mjs            (run from the repo root; data files are read from ./)
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const need = (k) => { const v = process.env[k]; if (!v) throw new Error(`missing ${k}`); return v; };
const URL_ = new URL(need('SUPABASE_URL')).origin, SERVICE = need('SUPABASE_SERVICE_ROLE_KEY'), PAT = process.env.SUPABASE_ACCESS_TOKEN;  // origin only: a pasted URL may carry /rest/v1/
const REF = new URL(URL_).hostname.split('.')[0];
const SITE = (process.env.SITE_URL || 'https://tchaudhary1.github.io/defense-budget-explorer/').replace(/\/?$/, '/');
const sb = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const BUCKET = 'data';
const FILES = ['data.b64.txt', 'taxonomy.json', 'taxonomy_v1.tsv.txt', 'taxonomy_v1_notes.txt', 'critique_v1.txt', 'taxonomy_v2.tsv.txt', 'taxonomy_v2_changelog.txt', 'classifier_brief.txt',
  'taxonomy_assignments.csv', 'blind_coding_sheet.csv', 'agreement_top150.tsv.txt', ...Array.from({length: 9}, (_, i) => `narration/v5/step${i}.mp3`), 'dod_p1_procurement_lines.csv', 'dod_r1_rdte_lines.csv', 'dod_o1_om_lines.csv', 'dod_m1_milpers_lines.csv', 'dod_c1_projects.csv', 'green_book_fy2023_series.csv', 'omb_function_050_series.csv'];
const TYPES = { '.txt': 'text/plain', '.json': 'application/json', '.csv': 'text/csv', '.mp3': 'audio/mpeg' };

async function mgmt(method, p, body) {
  if (!PAT) throw new Error('SUPABASE_ACCESS_TOKEN needed for ' + p);
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}${p}`, { method, headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
}

// 1. bucket
{
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.some(b => b.name === BUCKET)) { const { error } = await sb.storage.createBucket(BUCKET, { public: false, fileSizeLimit: '20MB' }); if (error) throw error; console.log('created bucket', BUCKET); }
  else console.log('bucket exists', BUCKET);
}
// 2. read policy for signed-in users (service role bypasses RLS, so uploads need no policy)
const POLICY_SQL = `drop policy if exists "dbe signed-in read" on storage.objects;
create policy "dbe signed-in read" on storage.objects for select to authenticated using (bucket_id = '${BUCKET}');`;
if (PAT) { await mgmt('POST', '/database/query', { query: POLICY_SQL }); console.log('storage read policy set'); }
else console.log('NO ACCESS TOKEN: run this in the SQL editor yourself:' + String.fromCharCode(10) + POLICY_SQL);
// 3. upload data files (upsert)
for (const f of FILES) {
  if (!fs.existsSync(f)) { console.warn('skip missing', f); continue; }
  const body = fs.readFileSync(f); const ct = TYPES[path.extname(f)] || 'application/octet-stream';
  const { error } = await sb.storage.from(BUCKET).upload(f, body, { upsert: true, contentType: ct, cacheControl: '3600' });
  if (error) throw new Error(`${f}: ${error.message}`); console.log('uploaded', f, (body.length / 1e6).toFixed(2), 'MB');
}
// 4. auth settings: invite-only, site URL and redirect list
if (PAT) { await mgmt('PATCH', '/config/auth', { disable_signup: true, site_url: SITE, uri_allow_list: `${SITE},${SITE}index.html,http://localhost:8921,http://localhost:8921/**` }); console.log('auth: public sign-ups disabled; site url', SITE); }
else console.log(`NO ACCESS TOKEN: in Authentication settings, turn off "Allow new users to sign up", set Site URL to ${SITE} and add http://localhost:8921 to the redirect allow list.`);
// 5. demo account
{
  const email = (process.env.DEMO_EMAIL || '').trim().toLowerCase();
  if (!email) { console.log('DEMO_EMAIL not set; no account created'); }
  else {
    const { data: list, error } = await sb.auth.admin.listUsers({ perPage: 200 }); if (error) throw error;
    const existing = list.users.find(u => u.email === email);
    if (existing) console.log('demo account exists:', email);
    else if (process.env.DEMO_PASSWORD) { const { error: e } = await sb.auth.admin.createUser({ email, password: process.env.DEMO_PASSWORD, email_confirm: true }); if (e) throw e; console.log('created demo account with the given password:', email); }
    else { const { error: e } = await sb.auth.admin.inviteUserByEmail(email, { redirectTo: SITE }); if (e) throw e; console.log('invite sent to', email, '(the link opens the site and asks for a password)'); }
  }
}
console.log('done');
