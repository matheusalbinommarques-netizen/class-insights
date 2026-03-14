import { createClient } from '@supabase/supabase-js';

type AdminClient = ReturnType<typeof createClient>;

let cachedAdminClient: AdminClient | null | undefined;

export function getSupabaseAdminClient(): AdminClient | null {
	if (cachedAdminClient !== undefined) {
		return cachedAdminClient;
	}

	const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !serviceRoleKey) {
		cachedAdminClient = null;
		return cachedAdminClient;
	}

	cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	return cachedAdminClient;
}
