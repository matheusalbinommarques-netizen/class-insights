import { createClient } from '@supabase/supabase-js';

import { getServerEnv } from '$lib/config/env.server';

type AdminClient = ReturnType<typeof createClient>;

let cachedAdminClient: AdminClient | null | undefined;

export function getSupabaseAdminClient(): AdminClient | null {
	if (cachedAdminClient !== undefined) {
		return cachedAdminClient;
	}

	let env: ReturnType<typeof getServerEnv>;
	try {
		env = getServerEnv();
	} catch {
		cachedAdminClient = null;
		return cachedAdminClient;
	}

	cachedAdminClient = createClient(env.supabaseUrl, env.serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	return cachedAdminClient;
}
