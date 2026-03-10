import { redirect, type ServerLoad } from '@sveltejs/kit';

type ProfileRole = 'teacher' | 'student' | 'coord';

type ProfileRow = {
	id: string;
	role: ProfileRole;
	display_name: string;
};

export const load: ServerLoad = async ({ locals, url }) => {
	if (!locals.session) {
		const redirectTo = `${url.pathname}${url.search}`;
		throw redirect(302, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const {
		data: { user },
		error: userError
	} = await locals.supabase.auth.getUser();

	if (userError || !user) {
		throw redirect(302, '/login');
	}

	const { data: profile, error: profileError } = await locals.supabase
		.from('profiles')
		.select('id, role, display_name')
		.eq('id', user.id)
		.single<ProfileRow>();

	if (profileError || !profile) {
		throw redirect(302, '/login');
	}

	if (profile.role !== 'student') {
		if (profile.role === 'teacher' || profile.role === 'coord') {
			throw redirect(302, '/teacher');
		}

		throw redirect(302, '/login');
	}

	return {
		authUser: {
			id: user.id,
			email: user.email ?? null
		},
		profile: {
			id: profile.id,
			role: profile.role,
			display_name: profile.display_name
		}
	};
};