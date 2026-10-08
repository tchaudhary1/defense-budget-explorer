// Manage demo accounts on the dashboard's Supabase project (service key from the environment, never on the command line).
//   DBE_SUPABASE_URL, DBE_SUPABASE_SERVICE_KEY in env
//   node tools/user.mjs create <username>    -> creates <username>@users.dbe.invalid with a random password written to ~/.dbe_pw_<username> (0600)
//   node tools/user.mjs disable <username>   -> bans the account (sign-ins rejected, existing sessions end at token refresh)
//   node tools/user.mjs enable <username>    -> lifts the ban
//   node tools/user.mjs rotate <username>    -> sets a new random password, written to ~/.dbe_pw_<username>
//   node tools/user.mjs delete <username>    -> removes the account
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const need = (k) => { const v = process.env[k]; if (!v) throw new Error(`missing ${k}`); return v; };
const sb = createClient(new URL(need('DBE_SUPABASE_URL')).origin, need('DBE_SUPABASE_SERVICE_KEY'), { auth: { persistSession: false } });
const [cmd, name] = process.argv.slice(2); if (!cmd || !name) { console.log('usage: node tools/user.mjs create|disable|enable|rotate|delete <username>'); process.exit(1); }
const email = name.includes('@') ? name.toLowerCase() : `${name.toLowerCase()}@users.dbe.invalid`;
const pwFile = path.join(os.homedir(), `.dbe_pw_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
const newPassword = () => crypto.randomBytes(12).toString('base64url').replace(/[-_]/g, 'x').slice(0, 16);
const writePw = (pw) => { fs.writeFileSync(pwFile, pw + '\n', { mode: 0o600 }); try { fs.chmodSync(pwFile, 0o600); } catch {} console.log(`starting password written to ${pwFile} (read it there; it is not printed)`); };
async function findUser() { let page = 1; for (;;) { const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 }); if (error) throw error; const u = data.users.find(u => (u.email || '').toLowerCase() === email); if (u) return u; if (data.users.length < 200) return null; page++; } }
const u = await findUser();
if (cmd === 'create') { if (u) { console.log('exists already:', email); process.exit(0); } const pw = newPassword(); const { error } = await sb.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { username: name, purpose: 'shared demo account' } }); if (error) throw error; console.log('created', email); writePw(pw); }
else if (!u) { console.log('no such user:', email); process.exit(1); }
else if (cmd === 'disable') { const { error } = await sb.auth.admin.updateUserById(u.id, { ban_duration: '876000h' }); if (error) throw error; console.log('disabled', email); }
else if (cmd === 'enable') { const { error } = await sb.auth.admin.updateUserById(u.id, { ban_duration: 'none' }); if (error) throw error; console.log('enabled', email); }
else if (cmd === 'rotate') { const pw = newPassword(); const { error } = await sb.auth.admin.updateUserById(u.id, { password: pw }); if (error) throw error; console.log('password rotated for', email); writePw(pw); }
else if (cmd === 'delete') { const { error } = await sb.auth.admin.deleteUser(u.id); if (error) throw error; console.log('deleted', email); }
else { console.log('unknown command', cmd); process.exit(1); }
