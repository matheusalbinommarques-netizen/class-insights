import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

type ClassRow = {
	id: string;
	name: string;
	created_at: string;
	score_min: number;
	score_max: number;
	score_decimals: number;
};

function getAuthenticatedUserId(locals: App.Locals): string | null {
	return locals.session?.user?.id ?? null;
}

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
	const userId = getAuthenticatedUserId(locals);

	if (!userId) {
		return {
			classes: [] as ClassRow[],
			error: 'Sessão inválida. Faça login novamente.'
		};
	}

	const { data, error } = await locals.supabase
		.from('classes')
		.select('id, name, created_at, score_min, score_max, score_decimals')
		.eq('teacher_id', userId)
		.order('created_at', { ascending: false });

	return {
		classes: ((data ?? []) as ClassRow[]),
		error: error?.message ?? null
	};
};

export const actions: Actions = {
	createClass: async ({ request, locals }) => {
		const form = await request.formData();

		const name = String(form.get('name') ?? '').trim();
		const scoreMin = parseDecimalInput(form.get('score_min'), 0);
		const scoreMax = parseDecimalInput(form.get('score_max'), 10);
		const scoreDecimals = parseIntegerInput(form.get('score_decimals'), 0);

		if (!name) {
			return fail(400, { message: 'Nome da turma é obrigatório.' });
		}

		if (!Number.isFinite(scoreMin) || !Number.isFinite(scoreMax)) {
			return fail(400, { message: 'Escala inválida: min e max precisam ser numéricos.' });
		}

		if (!(scoreMax > scoreMin)) {
			return fail(400, { message: 'Escala inválida: max precisa ser > min.' });
		}

		if (!Number.isInteger(scoreDecimals) || scoreDecimals < 0 || scoreDecimals > 6) {
			return fail(400, { message: 'Decimais inválidos (0 a 6).' });
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { message: 'Você precisa estar logado.' });
		}

		const { error } = await locals.supabase.from('classes').insert({
			name,
			teacher_id: userId,
			score_min: scoreMin,
			score_max: scoreMax,
			score_decimals: scoreDecimals
		});

		if (error) {
			return fail(400, { message: error.message });
		}

		return { success: true };
	},

	deleteClass: async ({ request, locals }) => {
		const form = await request.formData();
		const classId = String(form.get('classId') ?? '').trim();

		if (!classId) {
			return fail(400, { message: 'classId obrigatório.' });
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { message: 'Você precisa estar logado.' });
		}

		const { error } = await locals.supabase
			.from('classes')
			.delete()
			.eq('id', classId)
			.eq('teacher_id', userId);

		if (error) {
			return fail(400, { message: error.message });
		}

		return { success: true };
	}
};