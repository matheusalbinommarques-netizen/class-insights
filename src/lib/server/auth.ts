export type ProfileRole = 'teacher' | 'student' | 'coord';

export type ProfileRow = {
	id: string;
	role: ProfileRole;
	display_name: string;
};

export function getAuthenticatedUserId(locals: App.Locals): string | null {
	return locals.user?.id ?? locals.e2eProfile?.id ?? null;
}

export async function getCurrentAuthUser(locals: App.Locals) {
	if (locals.user) {
		return {
			id: locals.user.id,
			email: locals.user.email ?? null
		};
	}

	if (locals.e2eProfile) {
		return {
			id: locals.e2eProfile.id,
			email: locals.e2eProfile.email
		};
	}

	const {
		data: { user },
		error
	} = await locals.supabase.auth.getUser();

	if (error || !user) {
		return null;
	}

	locals.user = user;

	return {
		id: user.id,
		email: user.email ?? null
	};
}

export async function getProfileByUserId(
	locals: App.Locals,
	userId: string
): Promise<ProfileRow | null> {
	if (locals.e2eProfile?.id === userId) {
		return {
			id: locals.e2eProfile.id,
			role: locals.e2eProfile.role,
			display_name: locals.e2eProfile.display_name
		};
	}

	const { data, error } = await locals.supabase
		.from('profiles')
		.select('id, role, display_name')
		.eq('id', userId)
		.maybeSingle<ProfileRow>();

	if (error || !data) {
		return null;
	}

	return data;
}
