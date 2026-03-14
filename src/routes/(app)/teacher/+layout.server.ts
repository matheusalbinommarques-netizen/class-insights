import { redirect, type ServerLoad } from '@sveltejs/kit';
import { getCurrentAuthUser, getProfileByUserId } from '$lib/server/auth';

export const load: ServerLoad = async ({ locals, url }) => {
	if (!locals.session) {
		const redirectTo = `${url.pathname}${url.search}`;
		throw redirect(302, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const authUser = await getCurrentAuthUser(locals);
	if (!authUser) {
		throw redirect(302, '/login');
	}

	const profile = await getProfileByUserId(locals, authUser.id);
	if (!profile) {
		throw redirect(302, '/login');
	}

	if (profile.role !== 'teacher') {
		if (profile.role === 'coord') {
			throw redirect(302, '/coord');
		}

		throw redirect(302, '/student');
	}

	return {
		authUser,
		profile: {
			id: profile.id,
			role: profile.role,
			display_name: profile.display_name
		}
	};
};
