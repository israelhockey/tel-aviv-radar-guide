import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// TLV Radar runs on its own Supabase project (zmdjtfxspdoxpyowqbgc). Lovable injects the
// env vars of its former managed project at build time, which no longer exists, so the
// project is set here directly. The anon key is public by design; access is enforced by RLS.
const SUPABASE_URL = "https://zmdjtfxspdoxpyowqbgc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptZGp0ZnhzcGRveHB5b3dxYmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMjI5MzUsImV4cCI6MjEwNzg5ODkzNX0.I8l0ZTyeyyVdBER3GCh66AvlTM4tiwsKOA9MgGNOaHA";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});