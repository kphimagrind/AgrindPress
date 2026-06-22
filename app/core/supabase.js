import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Ganti teks di bawah ini dengan nilai yang Anda salin dari dashboard Supabase
const SUPABASE_URL = 'https://accummipymcmvcnhesei.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BwnIl1HDvQHkpmYHb6hPjA_fmc8osXa';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
