import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    // During SSG/build, env vars may not be available.
    // Return a minimal stub that won't throw.
    // Runtime calls will work once Vercel env vars are set.
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
