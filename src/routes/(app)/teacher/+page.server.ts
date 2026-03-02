import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: classes, error } = await locals.supabase
		.from('classes')
		.select('id, name, created_at, score_min, score_max, score_decimals')
		.order('created_at', { ascending: false });

	return {
		classes: classes ?? [],
		error: error?.message ?? null
	};
};

export const actions: Actions = {
	createClass: async ({ request, locals }) => {
		const form = await request.formData();

		const name = String(form.get('name') ?? '').trim();
		const scoreMin = Number(String(form.get('score_min') ?? '0'));
		const scoreMax = Number(String(form.get('score_max') ?? '10'));
		const scoreDecimals = Number(String(form.get('score_decimals') ?? '0'));

		if (!name) return fail(400, { message: 'Nome da turma é obrigatório.' });
		if (!Number.isFinite(scoreMin) || !Number.isFinite(scoreMax) || scoreMax <= scoreMin) {
			return fail(400, { message: 'Escala inválida: max precisa ser > min.' });
		}
		if (!Number.isInteger(scoreDecimals) || scoreDecimals < 0 || scoreDecimals > 6) {
			return fail(400, { message: 'Decimais inválidos (0 a 6).' });
		}

		const { data: auth } = await locals.supabase.auth.getUser();
		const userId = auth.user?.id;
		if (!userId) return fail(401, { message: 'Você precisa estar logado.' });

		const { error } = await locals.supabase.from('classes').insert({
			name,
			teacher_id: userId,
			score_min: scoreMin,
			score_max: scoreMax,
			score_decimals: scoreDecimals
		});

		if (error) return fail(400, { message: error.message });

		return { success: true };
	},

	deleteClass: async ({ request, locals }) => {
		const form = await request.formData();
		const classId = String(form.get('classId') ?? '').trim();
		if (!classId) return fail(400, { message: 'classId obrigatório.' });

		const { error } = await locals.supabase.from('classes').delete().eq('id', classId);
		if (error) return fail(400, { message: error.message });

		return { success: true };
	}
};