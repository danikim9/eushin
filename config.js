// Supabase connection for sign-up, login and cloud sync.
// Fill in the project's URL and its publishable (anon) key from Supabase → Project Settings → API.
// The publishable key is meant to be public; the data is protected by row level security
// (see supabase/migrations). Leave both empty to run without accounts, saving on the device only.
window.SPACE_WORDS_CONFIG = {
  supabaseUrl: '',
  supabaseKey: '',
};
