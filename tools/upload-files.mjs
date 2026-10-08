// Upload (upsert) named files from a data directory to the private `data` bucket.
//   DBE_SUPABASE_URL, DBE_SUPABASE_SERVICE_KEY in the environment (never on the command line)
//   node tools/upload-files.mjs <dataDir> <file> [file...]
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
const need = (k) => { const v = process.env[k]; if (!v) throw new Error(`missing ${k}`); return v; };
const URL_ = new URL(need('DBE_SUPABASE_URL')).origin, SERVICE = need('DBE_SUPABASE_SERVICE_KEY');
const sb = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const TYPES = { '.txt': 'text/plain', '.json': 'application/json', '.csv': 'text/csv', '.mp3': 'audio/mpeg' };
const [dir, ...files] = process.argv.slice(2);
for (const f of files) {
  const p = path.join(dir, f); if (!fs.existsSync(p)) { console.warn('skip missing', f); continue; }
  const body = fs.readFileSync(p);
  const { error } = await sb.storage.from('data').upload(f, body, { upsert: true, contentType: TYPES[path.extname(f)] || 'application/octet-stream', cacheControl: '60' });
  if (error) throw new Error(`${f}: ${error.message}`); console.log('uploaded', f, (body.length / 1e6).toFixed(2), 'MB');
}
