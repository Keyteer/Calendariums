import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://vzkgzzojfjhyzuvihmgd.supabase.co';
const supabasePublishableKey = 'sb_publishable_a1V-ay-SP19Ufyh2dski6A_6xtjJxFC';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
