import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error(
			'Missing VITE_PUBLIC_SUPABASE_URL or VITE_PUBLIC_SUPABASE_ANON_KEY in environment variables.'
		);
	}

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