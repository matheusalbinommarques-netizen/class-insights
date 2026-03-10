import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { resolveEffectiveScale, validateScoreInput } from '$lib/server/scoring';

type BaselineLatestSnapshotRow = {
	skill_id: string;
	skill_name: string;
	baseline_date: string | null;
	baseline_n: number | null;
	baseline_avg: number | null;
	baseline_median: number | null;
	latest_date: string | null;
	latest_n: number | null;
	latest_avg: number | null;
	latest_median: number | null;
};

type OwnedClass = {
	id: string;
	name: string;
	score_min: number;
	score_max: number;
	score_decimals: number;
};

function getAuthenticatedUserId(locals: App.Locals): string | null {
	return locals.session?.user?.id ?? null;
}

async function getOwnedClass(
	locals: App.Locals,
	classId: string,
	userId: string
): Promise<OwnedClass | null> {
	const { data, error } = await locals.supabase
		.from('classes')
		.select('id, name, score_min, score_max, score_decimals')
		.eq('id', classId)
		.eq('teacher_id', userId)
		.maybeSingle();

	if (error || !data) return null;

	return {
		id: data.id,
		name: data.name,
		score_min: data.score_min,
		score_max: data.score_max,
		score_decimals: data.score_decimals
	};
}

function todayUTCDateString(): string {
	return new Date().toISOString().slice(0, 10);
}

function generateInviteCode(): string {
	return crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const classId = params.classId;
	const today = todayUTCDateString();

	const userId = getAuthenticatedUserId(locals);
	if (!userId) {
		return {
			class: null,
			students: [],
			skills: [],
			scores: [],
			insights: null,
			hasTodaySnapshot: false,
			today
		};
	}

	const classData = await getOwnedClass(locals, classId, userId);

	if (!classData) {
		return {
			class: null,
			students: [],
			skills: [],
			scores: [],
			insights: null,
			hasTodaySnapshot: false,
			today
		};
	}

	const { data: students } = await locals.supabase
		.from('students')
		.select('id, name, invite_code, created_at')
		.eq('class_id', classId)
		.order('created_at', { ascending: true });

	const { data: skills } = await locals.supabase
		.from('skills')
		.select('id, name, created_at, score_min, score_max, score_decimals')
		.eq('class_id', classId)
		.order('created_at', { ascending: true });

	const studentIds = (students ?? []).map((s) => s.id);

	let scores: { student_id: string; skill_id: string; score: number }[] = [];
	if (studentIds.length > 0) {
		const { data: sc } = await locals.supabase
			.from('student_skill_scores')
			.select('student_id, skill_id, score')
			.in('student_id', studentIds);

		scores = sc ?? [];
	}

	const { data: bl, error: blErr } = await locals.supabase.rpc(
		'get_baseline_latest_snapshots',
		{
			p_class_id: classId
		}
	);

	const insightsRows: BaselineLatestSnapshotRow[] =
		(bl as BaselineLatestSnapshotRow[] | null)?.map((r) => ({
			skill_id: r.skill_id,
			skill_name: r.skill_name,
			baseline_date: r.baseline_date,
			baseline_n: r.baseline_n ?? null,
			baseline_avg: r.baseline_avg ?? null,
			baseline_median: r.baseline_median ?? null,
			latest_date: r.latest_date,
			latest_n: r.latest_n ?? null,
			latest_avg: r.latest_avg ?? null,
			latest_median: r.latest_median ?? null
		})) ?? [];

	const hasTodaySnapshot = insightsRows.some((r) => r.latest_date === today);

	const latestAvgs = insightsRows
		.map((r) => r.latest_avg)
		.filter((v): v is number => typeof v === 'number');

	const classAvg = latestAvgs.length
		? latestAvgs.reduce((a, b) => a + b, 0) / latestAvgs.length
		: null;

	const criticalSkill =
		insightsRows
			.filter((r) => typeof r.latest_avg === 'number')
			.sort((a, b) => (a.latest_avg ?? 0) - (b.latest_avg ?? 0))[0] ?? null;

	const strongSkill =
		insightsRows
			.filter((r) => typeof r.latest_avg === 'number')
			.sort((a, b) => (b.latest_avg ?? 0) - (a.latest_avg ?? 0))[0] ?? null;

	return {
		class: classData,
		students: students ?? [],
		skills: skills ?? [],
		scores,
		insights: blErr
			? null
			: {
					rows: insightsRows,
					kpis: { classAvg, criticalSkill, strongSkill }
				},
		hasTodaySnapshot,
		today
	};
};

export const actions: Actions = {
	createStudent: async ({ request, params, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();

		if (!name) {
			return fail(400, { message: 'Nome do aluno é obrigatório.' });
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { message: 'Você precisa estar logado.' });
		}

		const ownedClass = await getOwnedClass(locals, params.classId, userId);
		if (!ownedClass) {
			return fail(404, { message: 'Turma não encontrada.' });
		}

		const inviteCode = generateInviteCode();

		const { error } = await locals.supabase.from('students').insert({
			name,
			class_id: ownedClass.id,
			invite_code: inviteCode
		});

		if (error) {
			return fail(400, { message: error.message });
		}

		return { success: true };
	},

	createSkill: async ({ request, params, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();

		if (!name) {
			return fail(400, { message: 'Nome da skill é obrigatório.' });
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { message: 'Você precisa estar logado.' });
		}

		const ownedClass = await getOwnedClass(locals, params.classId, userId);
		if (!ownedClass) {
			return fail(404, { message: 'Turma não encontrada.' });
		}

		const { error } = await locals.supabase.from('skills').insert({
			name,
			class_id: ownedClass.id
		});

		if (error) {
			return fail(400, { message: error.message });
		}

		return { success: true };
	},

	deleteSkill: async ({ request, params, locals }) => {
		const form = await request.formData();
		const skillId = String(form.get('skillId') ?? '').trim();

		if (!skillId) {
			return fail(400, { message: 'Skill inválida.' });
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { message: 'Você precisa estar logado.' });
		}

		const ownedClass = await getOwnedClass(locals, params.classId, userId);
		if (!ownedClass) {
			return fail(404, { message: 'Turma não encontrada.' });
		}

		const { error } = await locals.supabase
			.from('skills')
			.delete()
			.eq('id', skillId)
			.eq('class_id', ownedClass.id);

		if (error) {
			return fail(400, { message: error.message });
		}

		return { success: true };
	},

	updateSkillScale: async ({ request, params, locals }) => {
		const form = await request.formData();
		const skillId = String(form.get('skillId') ?? '').trim();
		const mode = String(form.get('mode') ?? 'inherit');

		if (!skillId) {
			return fail(400, { message: 'Skill inválida.' });
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { message: 'Você precisa estar logado.' });
		}

		const ownedClass = await getOwnedClass(locals, params.classId, userId);
		if (!ownedClass) {
			return fail(404, { message: 'Turma não encontrada.' });
		}

		if (mode === 'inherit') {
			const { error } = await locals.supabase
				.from('skills')
				.update({ score_min: null, score_max: null, score_decimals: null })
				.eq('id', skillId)
				.eq('class_id', ownedClass.id);

			if (error) {
				return fail(400, { message: error.message });
			}

			return { success: true };
		}

		const scoreMin = Number(String(form.get('score_min') ?? '').replace(',', '.'));
		const scoreMax = Number(String(form.get('score_max') ?? '').replace(',', '.'));
		const decimals = Number(String(form.get('score_decimals') ?? '0'));

		if (!Number.isFinite(scoreMin) || !Number.isFinite(scoreMax)) {
			return fail(400, { message: 'Min/Max inválidos.' });
		}

		if (!(scoreMax > scoreMin)) {
			return fail(400, { message: 'Max precisa ser maior que Min.' });
		}

		if (!Number.isFinite(decimals) || decimals < 0 || decimals > 6) {
			return fail(400, { message: 'Decimais inválidos.' });
		}

		const { error } = await locals.supabase
			.from('skills')
			.update({ score_min: scoreMin, score_max: scoreMax, score_decimals: decimals })
			.eq('id', skillId)
			.eq('class_id', ownedClass.id);

		if (error) {
			return fail(400, { message: error.message });
		}

		return { success: true };
	},

	upsertScore: async ({ request, params, locals }) => {
		const form = await request.formData();
		const studentId = String(form.get('studentId') ?? '').trim();
		const skillId = String(form.get('skillId') ?? '').trim();
		const rawScore = String(form.get('score') ?? '').trim();

		if (!studentId || !skillId) {
			return fail(400, { message: 'Aluno/skill inválidos.' });
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { message: 'Você precisa estar logado.' });
		}

		const ownedClass = await getOwnedClass(locals, params.classId, userId);
		if (!ownedClass) {
			return fail(404, { message: 'Turma não encontrada.' });
		}

		const { data: student, error: studentErr } = await locals.supabase
			.from('students')
			.select('id')
			.eq('id', studentId)
			.eq('class_id', ownedClass.id)
			.maybeSingle();

		if (studentErr || !student) {
			return fail(400, { message: studentErr?.message ?? 'Aluno não encontrado.' });
		}

		const { data: skill, error: skillErr } = await locals.supabase
			.from('skills')
			.select('id, class_id, score_min, score_max, score_decimals')
			.eq('id', skillId)
			.eq('class_id', ownedClass.id)
			.maybeSingle();

		if (skillErr || !skill) {
			return fail(400, { message: skillErr?.message ?? 'Skill não encontrada.' });
		}

		const scale = resolveEffectiveScale(ownedClass, skill);

		const validation = validateScoreInput(rawScore, scale, {
			allowBlank: true
		});

		if (!rawScore) {
			const { error } = await locals.supabase
				.from('student_skill_scores')
				.delete()
				.eq('student_id', studentId)
				.eq('skill_id', skillId);

			if (error) {
				return fail(400, { message: error.message });
			}

			return { success: true };
		}

		if (!validation.ok) {
			return fail(400, { message: validation.message });
		}

		const { error } = await locals.supabase
			.from('student_skill_scores')
			.upsert([{ student_id: studentId, skill_id: skillId, score: validation.value }], {
				onConflict: 'student_id,skill_id'
			});

		if (error) {
			return fail(400, { message: error.message });
		}

		return { success: true };
	},

	generateSnapshot: async ({ params, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { message: 'Você precisa estar logado.' });
		}

		const ownedClass = await getOwnedClass(locals, params.classId, userId);
		if (!ownedClass) {
			return fail(404, { message: 'Turma não encontrada.' });
		}

		const { data, error } = await locals.supabase.rpc('generate_mastery_snapshot', {
			p_class_id: ownedClass.id
		});

		if (error) {
			return fail(400, { message: error.message });
		}

		return { success: true, snapshot: data };
	}
};