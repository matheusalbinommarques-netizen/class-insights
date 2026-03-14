export type ProfileRole = 'teacher' | 'student' | 'coord';

export type ProfileRow = {
	id: string;
	role: ProfileRole;
	display_name: string;
};

export function getAuthenticatedUserId(locals: App.Locals): string | null {
	return locals.session?.user?.id ?? null;
}

export async function getCurrentAuthUser(locals: App.Locals) {
	const {
		data: { user },
		error
	} = await locals.supabase.auth.getUser();

	if (error || !user) {
		return null;
	}

	return {
		id: user.id,
		email: user.email ?? null
	};
}

export async function getProfileByUserId(
	locals: App.Locals,
	userId: string
): Promise<ProfileRow | null> {
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
