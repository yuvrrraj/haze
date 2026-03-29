import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        lock: undefined,
      },
    });
  }
  return _client;
}

export const supabase = getClient();

// ── Cached user — resolved once, then instant ────────────────────────────────
let _cachedUser: User | null = null;
let _initialized = false;
let _initPromise: Promise<User | null> | null = null;

export function getCurrentUser(): Promise<User | null> {
  if (_initialized) return Promise.resolve(_cachedUser);
  if (_initPromise) return _initPromise;

  _initPromise = supabase.auth.getSession().then(({ data }) => {
    _cachedUser = data.session?.user ?? null;
    _initialized = true;
    _initPromise = null;
    return _cachedUser;
  });

  return _initPromise;
}

// Sync — returns cached value immediately (use after first load)
export function getCachedUser(): User | null {
  return _cachedUser;
}

// Keep cache in sync on auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedUser = session?.user ?? null;
  _initialized = true;
  _initPromise = null;
});
