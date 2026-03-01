import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { classId } = params;

	const { data: classData } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('id', classId)
		.single();

	const { data: students } = await locals.supabase
		.from('students')
		.select('id, name')
		.eq('class_id', classId)
		.order('created_at', { ascending: false });

	return {
		class: classData,
		students: students ?? []
	};
};

export const actions: Actions = {
	createStudent: async ({ request, params, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();

		if (!name) {
			return fail(400, { message: 'Nome do aluno é obrigatório.' });
		}

		const { error } = await locals.supabase.from('students').insert({
			name,
			class_id: params.classId
		});

		if (error) {
			return fail(400, { message: error.message });
		}

		return { success: true };
	}
};