// Public configuration for the hosted site. The publishable key is designed to be public; the
// storage read policy in Supabase is what keeps the data behind the sign-in.
window.DBE = {
  SUPABASE_URL: 'https://aizytqcqzgtlghvayyle.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_Qakufm85rqeAd2sOf17Tdg_umEY0Iqi',
  BUCKET: 'data',
  USER_DOMAIN: 'users.dbe.invalid',  // bare usernames at sign-in become name@this-domain (no mailbox; .invalid never resolves)
};
