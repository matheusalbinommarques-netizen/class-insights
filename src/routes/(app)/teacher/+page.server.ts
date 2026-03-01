import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error } = await locals.supabase
		.from('classes')
		.select('id, name, created_at')
		.order('created_at', { ascending: false });

	if (error) {
		return { classes: [], error: error.message };
	}

	return { classes: data ?? [], error: null };
};

export const actions: Actions = {
	createClass: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();

		if (!name) {
			return fail(400, { message: 'Nome da turma é obrigatório.' });
		}

		const { data: userData, error: userErr } = await locals.supabase.auth.getUser();
		if (userErr || !userData.user) {
			return fail(401, { message: 'Não autenticado.' });
		}

		const { error } = await locals.supabase.from('classes').insert({
			name,
			teacher_id: userData.user.id
		});

		if (error) {
			return fail(400, { message: error.message });
		}

		return { success: true };
	}
};
