import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { getAuthenticatedUserId } from '$lib/server/auth';
import { buildTeacherDashboardPageData } from '$lib/server/teacher-dashboard';

function parseDecimalInput(raw: FormDataEntryValue | null, fallback: number): number {
	const normalized = String(raw ?? '')
		.trim()
		.replace(/\s+/g, '')
		.replace(',', '.');

	if (!normalized) return fallback;
	return Number(normalized);
}

function parseIntegerInput(raw: FormDataEntryValue | null, fallback: number): number {
	const normalized = String(raw ?? '').trim();
	if (!normalized) return fallback;

	return Number(normalized);
}

export const load: PageServerLoad = async ({ locals }) => {
	return buildTeacherDashboardPageData(locals);
};

export const actions: Actions = {
	createClass: async ({ request, locals }) => {
		const form = await request.formData();

		const name = String(form.get('name') ?? '').trim();
		const scoreMin = parseDecimalInput(form.get('score_min'), 0);
		const scoreMax = parseDecimalInput(form.get('score_max'), 10);
		const scoreDecimals = parseIntegerInput(form.get('score_decimals'), 0);

		if (!name) {
			return fail(400, { action: 'createClass', message: 'Nome da turma e obrigatorio.' });
		}

		if (!Number.isFinite(scoreMin) || !Number.isFinite(scoreMax)) {
			return fail(400, {
				action: 'createClass',
				message: 'Escala invalida: min e max precisam ser numericos.'
			});
		}

		if (!(scoreMax > scoreMin)) {
			return fail(400, {
				action: 'createClass',
				message: 'Escala invalida: max precisa ser > min.'
			});
		}

		if (!Number.isInteger(scoreDecimals) || scoreDecimals < 0 || scoreDecimals > 6) {
			return fail(400, {
				action: 'createClass',
				message: 'Decimais invalidos (0 a 6).'
			});
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createClass', message: 'Voce precisa estar logado.' });
		}

		const { error } = await locals.supabase.from('classes').insert({
			name,
			teacher_id: userId,
			score_min: scoreMin,
			score_max: scoreMax,
			score_decimals: scoreDecimals
		});

		if (error) {
			return fail(400, { action: 'createClass', message: error.message });
		}

		return {
			success: true,
			action: 'createClass',
			message: 'Turma criada com sucesso.'
		};
	},

	deleteClass: async ({ request, locals }) => {
		const form = await request.formData();
		const classId = String(form.get('classId') ?? '').trim();

		if (!classId) {
			return fail(400, { action: 'deleteClass', message: 'classId obrigatorio.' });
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'deleteClass', message: 'Voce precisa estar logado.' });
		}

		const { error } = await locals.supabase
			.from('classes')
			.delete()
			.eq('id', classId)
			.eq('teacher_id', userId);

		if (error) {
			return fail(400, { action: 'deleteClass', message: error.message });
		}

		return {
			success: true,
			action: 'deleteClass',
			message: 'Turma removida com sucesso.'
		};
	},

	generateClassSnapshot: async ({ request, locals }) => {
		const form = await request.formData();
		const classId = String(form.get('classId') ?? '').trim();

		if (!classId) {
			return fail(400, {
				action: 'generateClassSnapshot',
				message: 'classId obrigatorio.'
			});
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, {
				action: 'generateClassSnapshot',
				message: 'Voce precisa estar logado.'
			});
		}

		const { data: ownedClass, error: classError } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.eq('teacher_id', userId)
			.maybeSingle<{ id: string }>();

		if (classError || !ownedClass) {
			return fail(404, {
				action: 'generateClassSnapshot',
				message: 'Turma nao encontrada.'
			});
		}

		const { error } = await locals.supabase.rpc('generate_mastery_snapshot', {
			p_class_id: classId
		});

		if (error) {
			return fail(400, {
				action: 'generateClassSnapshot',
				message: error.message
			});
		}

		return {
			success: true,
			action: 'generateClassSnapshot',
			message: 'Leitura da turma atualizada com sucesso.'
		};
	}
};
