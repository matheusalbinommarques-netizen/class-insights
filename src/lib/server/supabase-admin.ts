import { createClient } from '@supabase/supabase-js';

import { getServerEnv } from '$lib/config/env.server';

type AdminClient = ReturnType<typeof createClient>;

let cachedAdminClient: AdminClient | null | undefined;

export function getSupabaseAdminClient(): AdminClient | null {
	if (cachedAdminClient !== undefined) {
		return cachedAdminClient;
	}

	const { supabaseUrl, serviceRoleKey } = getServerEnv();

	cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	return cachedAdminClient;
}
