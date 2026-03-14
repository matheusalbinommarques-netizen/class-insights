import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';

import { getPublicEnv } from '$lib/config/env';

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
