import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(
		import.meta.env.VITE_PUBLIC_SUPABASE_URL,
		import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookies) => {
					cookies.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, {
							...options,
							path: options?.path ?? '/'
						});
					});
				}
			}
		}
	);

	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();

	event.locals.session = session;

	return resolve(event);
};