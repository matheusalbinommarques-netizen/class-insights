import { createBrowserClient } from '@supabase/ssr';

import { getPublicEnv } from '$lib/config/env';

const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
