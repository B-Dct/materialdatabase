import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTYxNTg5ODAzMCwiZXhwIjoxOTMxMjU4MDMwfQ.b--B1_z8z8nJ_J1_z8z8nJ_J1_z8z8nJ_J1_z8z8nJ_J1'; // Dummy key, we can't do this easily. Next approach.

