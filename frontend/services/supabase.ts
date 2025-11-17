import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vzkgzzojfjhyzuvihmgd.supabase.co';
const supabasePublishableKey = 'sb_publishable_a1V-ay-SP19Ufyh2dski6A_6xtjJxFC';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
