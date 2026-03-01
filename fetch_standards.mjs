import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let url = 'http://127.0.0.1:54321';
let key = '';

try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
  }
} catch (e) {
  console.log('No .env.local found');
}

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase.from('requirement_profiles').select('name, rules, layup_architectures').limit(3);
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log(JSON.stringify(data, null, 2));

  // Also fetch assigned profiles from PHG-9012
  const { data: mat, error: matErr } = await supabase.from('materials').select('assigned_profile_ids').ilike('name', '%9012%');
  if (matErr) console.error(matErr);
  else console.log(JSON.stringify(mat, null, 2));
}

main();
