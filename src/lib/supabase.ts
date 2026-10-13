// Supabase browser client for the builder's magic-link auth. The anon key is public
// (safe to ship in the client) — it can only do what row-level-security/allowed. Auth
// verification happens server-side (the VPS validates the session token against Supabase).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Guard so a missing env at build time doesn't hard-crash module load.
export const supabaseReady = Boolean(url && anon);

export const supabase = createClient(url || "https://placeholder.supabase.co", anon || "placeholder", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
