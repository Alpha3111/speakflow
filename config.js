// SpeakFlow public browser configuration.
// These values are browser-safe publishable credentials protected by Supabase RLS.
// Never put a service_role key here.
export const SUPABASE_URL = "https://lfixgoibfqoqdguyubih.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SHhK1n50JIE8PLpAuoyLlA_zk_-CLs_";

// Load the mobile sentence-builder enhancements as a side effect for both app modules.
import("./word-builder-enhance.js?v=1").catch(() => {});
