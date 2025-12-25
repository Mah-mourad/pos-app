
// import { createClient } from '@supabase/supabase-js';

// // Default Config provided by user
// const DEFAULT_URL = 'https://mnuasgbeccfoqvzpccze.supabase.co';
// const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udWFzZ2JlY2Nmb3F2enBjY3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NDMyOTgsImV4cCI6MjA4MDExOTI5OH0.WD7aPW-gl6SOIBF5oSn0MlWO9A9ViYZXnGgPajK7Ltg';

// // Try to load config from LocalStorage
// const savedConfigStr = localStorage.getItem('pos_supabase_config');
// const savedConfig = savedConfigStr ? JSON.parse(savedConfigStr) : null;

// // Determine Config to use (Local Storage overrides default)
// const url = savedConfig?.url || DEFAULT_URL;
// const key = savedConfig?.key || DEFAULT_KEY;

// // Initialize Supabase Client
// let supabaseClient = null;
// let configured = false;

// if (url && key) {
//     try {
//         supabaseClient = createClient(url, key);
//         configured = true;
//     } catch (e) {
//         console.error("Supabase Initialization Error:", e);
//     }
// }

// export const supabase = supabaseClient;
// export const isConfigured = configured;



// import { createClient, SupabaseClient } from '@supabase/supabase-js';

// // ⚠️ استخدم ENV variables (الأصح)
// const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
// const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
//   throw new Error('Supabase environment variables are missing');
// }

// // Supabase client (Singleton)
// export const supabase: SupabaseClient = createClient(
//   SUPABASE_URL,
//   SUPABASE_ANON_KEY,
//   {
//     auth: {
//       persistSession: false,   // POS app → no auth sessions
//       autoRefreshToken: false
//     }
//   }
// );

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
