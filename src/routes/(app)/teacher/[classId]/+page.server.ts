import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

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

function toNumberMaybe(raw: string): number | null {
	const v = String(raw ?? '').trim();
	if (!v) return null;
	const n = Number(v.replace(',', '.'));
	return Number.isNaN(n) ? null : n;
}

function countDecimals(raw: string): number {
	const v = String(raw ?? '').trim().replace(',', '.');
	const idx = v.indexOf('.');
	return idx === -1 ? 0 : v.length - idx - 1;
}

function todayUTCDateString(): string {
	return new Date().toISOString().slice(0, 10);
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const classId = params.classId;

	const { data: classData, error: classErr } = await locals.supabase
		.from('classes')
		.select('id, name, score_min, score_max, score_decimals')
		.eq('id', classId)
		.single();

	if (classErr) {
		return {
			class: null,
			students: [],
			skills: [],
			scores: [],
			insights: null,
			hasTodaySnapshot: false,
			today: todayUTCDateString()
		};
	}

	const { data: students } = await locals.supabase
		.from('students')
		.select('id, name, created_at')
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

	const today = todayUTCDateString();
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

		if (!name) return fail(400, { message: 'Nome do aluno é obrigatório.' });

		const { error } = await locals.supabase.from('students').insert({
			name,
			class_id: params.classId
		});

		if (error) return fail(400, { message: error.message });
		return { success: true };
	},

	createSkill: async ({ request, params, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();

		if (!name) return fail(400, { message: 'Nome da skill é obrigatório.' });

		const { error } = await locals.supabase.from('skills').insert({
			name,
			class_id: params.classId
		});

		if (error) return fail(400, { message: error.message });
		return { success: true };
	},

	deleteSkill: async ({ request, params, locals }) => {
		const form = await request.formData();
		const skillId = String(form.get('skillId') ?? '').trim();

		if (!skillId) return fail(400, { message: 'Skill inválida.' });

		const { error } = await locals.supabase
			.from('skills')
			.delete()
			.eq('id', skillId)
			.eq('class_id', params.classId);

		if (error) return fail(400, { message: error.message });
		return { success: true };
	},

	updateSkillScale: async ({ request, params, locals }) => {
		const form = await request.formData();
		const skillId = String(form.get('skillId') ?? '').trim();
		const mode = String(form.get('mode') ?? 'inherit');

		if (!skillId) return fail(400, { message: 'Skill inválida.' });

		if (mode === 'inherit') {
			const { error } = await locals.supabase
				.from('skills')
				.update({ score_min: null, score_max: null, score_decimals: null })
				.eq('id', skillId)
				.eq('class_id', params.classId);

			if (error) return fail(400, { message: error.message });
			return { success: true };
		}

		const scoreMin = toNumberMaybe(String(form.get('score_min') ?? ''));
		const scoreMax = toNumberMaybe(String(form.get('score_max') ?? ''));
		const decimals = Number(String(form.get('score_decimals') ?? '0'));

		if (scoreMin === null || scoreMax === null) {
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
			.eq('class_id', params.classId);

		if (error) return fail(400, { message: error.message });
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

		const { data: sk, error: skErr } = await locals.supabase
			.from('skills')
			.select('id, class_id, score_min, score_max, score_decimals')
			.eq('id', skillId)
			.eq('class_id', params.classId)
			.single();

		if (skErr || !sk) {
			return fail(400, { message: skErr?.message ?? 'Skill não encontrada.' });
		}

		const { data: cls, error: clsErr } = await locals.supabase
			.from('classes')
			.select('score_min, score_max, score_decimals')
			.eq('id', params.classId)
			.single();

		if (clsErr || !cls) {
			return fail(400, { message: clsErr?.message ?? 'Turma não encontrada.' });
		}

		const min = sk.score_min ?? cls.score_min;
		const max = sk.score_max ?? cls.score_max;
		const decimals = sk.score_decimals ?? cls.score_decimals;

		if (!rawScore) {
			const { error } = await locals.supabase
				.from('student_skill_scores')
				.delete()
				.eq('student_id', studentId)
				.eq('skill_id', skillId);

			if (error) return fail(400, { message: error.message });
			return { success: true };
		}

		const n = toNumberMaybe(rawScore);
		if (n === null) return fail(400, { message: 'Nota inválida.' });
		if (n < min || n > max) return fail(400, { message: `Fora do range (${min}–${max}).` });

		if (countDecimals(rawScore) > Number(decimals ?? 0)) {
			return fail(400, { message: `Muitas casas decimais (máx ${decimals}).` });
		}

		const { error } = await locals.supabase
			.from('student_skill_scores')
			.upsert([{ student_id: studentId, skill_id: skillId, score: n }], {
				onConflict: 'student_id,skill_id'
			});

		if (error) return fail(400, { message: error.message });
		return { success: true };
	},

	generateSnapshot: async ({ params, locals }) => {
		const classId = params.classId;

		const { data, error } = await locals.supabase.rpc('generate_mastery_snapshot', {
			p_class_id: classId
		});

		if (error) return fail(400, { message: error.message });

		return { success: true, snapshot: data };
	}
};