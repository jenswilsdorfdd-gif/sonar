import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://loyzfkxkuyypgteskxkm.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxveXpma3hrdXl5cGd0ZXNreGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NDc2OTcsImV4cCI6MjEwMDEyMzY5N30.1MfQqCDmyUdSwgzty10mUMe7SFGdsw-1azjhndOC000';

export const supabase = createClient(supabaseUrl, supabaseKey);
