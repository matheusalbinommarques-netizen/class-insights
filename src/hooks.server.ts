import { createServerClient } from '@supabase/ssr';
import type { Session } from '@supabase/supabase-js';
import type { Handle } from '@sveltejs/kit';

import { getPublicEnv } from '$lib/config/env';

const E2E_AUTH_ENABLED =
	import.meta.env.CI_E2E_AUTH_ENABLED === 'true' || process.env.CI_E2E_AUTH_ENABLED === 'true';

export const handle: Handle = async ({ event, resolve }) => {
	const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

	event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies) => {
				for (const { name, value, options } of cookies) {
					event.cookies.set(name, value, {
						...options,
						path: options?.path ?? '/'
					});
				}
			}
		}
	});

	if (E2E_AUTH_ENABLED) {
		const role = event.cookies.get('ci_e2e_role');
		const userId = event.cookies.get('ci_e2e_user_id');
		const displayName = event.cookies.get('ci_e2e_display_name');
		const email = event.cookies.get('ci_e2e_email') ?? `${role ?? 'user'}@e2e.local`;

		if (userId && displayName && (role === 'teacher' || role === 'student' || role === 'coord')) {
			const decodedDisplayName = decodeURIComponent(displayName);
			event.locals.e2eProfile = {
				id: userId,
				role,
				display_name: decodedDisplayName,
				email
			};
			event.locals.session = {
				access_token: 'e2e-access-token',
				refresh_token: 'e2e-refresh-token',
				expires_in: 3600,
				expires_at: Math.floor(Date.now() / 1000) + 3600,
				token_type: 'bearer',
				user: {
					id: userId,
					email,
					app_metadata: {},
					user_metadata: {
						role,
						display_name: decodedDisplayName
					},
					aud: 'authenticated',
					created_at: new Date().toISOString()
				}
			} as Session;
			return resolve(event);
		}
	}

	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();

	if (!session) {
		event.locals.session = null;
		return resolve(event);
	}

	const {
		data: { user },
		error
	} = await event.locals.supabase.auth.getUser();

	event.locals.session = !error && user ? session : null;

	return resolve(event);
};
