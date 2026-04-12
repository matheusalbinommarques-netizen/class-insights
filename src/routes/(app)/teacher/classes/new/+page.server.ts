import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

import { getAuthenticatedUserId } from '$lib/server/auth';

type CreateClassValues = {
	name: string;
	score_min: string;
	score_max: string;
	score_decimals: string;
};

const DEFAULT_VALUES: CreateClassValues = {
	name: '',
	score_min: '0',
	score_max: '10',
	score_decimals: '0'
};

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

function readCreateClassValues(form: FormData): CreateClassValues {
	return {
		name: String(form.get('name') ?? '').trim(),
		score_min: String(form.get('score_min') ?? '').trim(),
		score_max: String(form.get('score_max') ?? '').trim(),
		score_decimals: String(form.get('score_decimals') ?? '').trim()
	};
}

export const load: PageServerLoad = async () => {
	return {
		initialValues: DEFAULT_VALUES
	};
};

export const actions: Actions = {
	createClass: async ({ request, locals }) => {
		const form = await request.formData();
		const values = readCreateClassValues(form);

		const name = values.name;
		const scoreMin = parseDecimalInput(form.get('score_min'), 0);
		const scoreMax = parseDecimalInput(form.get('score_max'), 10);
		const scoreDecimals = parseIntegerInput(form.get('score_decimals'), 0);

		if (!name) {
			return fail(400, {
				action: 'createClass',
				message: 'Informe o nome da turma.',
				values
			});
		}

		if (!Number.isFinite(scoreMin) || !Number.isFinite(scoreMax)) {
			return fail(400, {
				action: 'createClass',
				message: 'A escala precisa ter nota mínima e máxima numéricas.',
				values
			});
		}

		if (!(scoreMax > scoreMin)) {
			return fail(400, {
				action: 'createClass',
				message: 'A nota máxima precisa ser maior que a mínima.',
				values
			});
		}

		if (!Number.isInteger(scoreDecimals) || scoreDecimals < 0 || scoreDecimals > 6) {
			return fail(400, {
				action: 'createClass',
				message: 'As casas decimais devem ficar entre 0 e 6.',
				values
			});
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, {
				action: 'createClass',
				message: 'Você precisa estar logado.',
				values
			});
		}

		const { data, error } = await locals.supabase
			.from('classes')
			.insert({
				name,
				teacher_id: userId,
				score_min: scoreMin,
				score_max: scoreMax,
				score_decimals: scoreDecimals
			})
			.select('id')
			.single<{ id: string }>();

		if (error || !data) {
			return fail(400, {
				action: 'createClass',
				message: error?.message ?? 'Não foi possível criar a turma.',
				values
			});
		}

		throw redirect(303, `/teacher/${data.id}`);
	}
};
