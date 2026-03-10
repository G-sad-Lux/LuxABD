import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vgjngaksyzjskajmoknu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnam5nYWtzeXpqc2tham1va251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MjY0ODQsImV4cCI6MjA4NTQwMjQ4NH0.WjJRrMrDyJDfNR5lVhk4uthSKvhNmk-g5JG0vyQHoIo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
