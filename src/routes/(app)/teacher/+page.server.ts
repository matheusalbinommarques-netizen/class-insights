import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { resolveEffectiveScale } from '$lib/server/scoring';

type ClassRow = {
	id: string;
	name: string;
	created_at: string;
	score_min: number;
	score_max: number;
	score_decimals: number;
};

type StudentRow = {
	id: string;
	name: string;
	class_id: string;
};

type SkillRow = {
	id: string;
	name: string;
	class_id: string;
	score_min: number | null;
	score_max: number | null;
	score_decimals: number | null;
};

type ScoreRow = {
	student_id: string;
	skill_id: string;
	score: number;
};

type BaselineLatestSnapshotRow = {
	skill_id: string;
	skill_name: string;
	baseline_date: string | null;
	baseline_avg: number | null;
	latest_date: string | null;
	latest_avg: number | null;
};

type DashboardClassCard = {
	id: string;
	name: string;
	created_at: string;
	scaleLabel: string;
	studentsCount: number;
	skillsCount: number;
	filledScoresCount: number;
	totalExpectedCells: number;
	pendingCells: number;
	coveragePercent: number;
	averagePercent: number | null;
	riskStudentsCount: number;
	latestSnapshotDate: string | null;
	needsSnapshot: boolean;
	trendDelta: number | null;
	focusSkills: string[];
	status: 'setup' | 'healthy' | 'attention' | 'critical';
};

type ActionQueueItem = {
	id: string;
	classId: string;
	title: string;
	description: string;
	ctaLabel: string;
	href: string;
	priority: number;
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

function clampPercent(value: number): number {
	return Math.max(0, Math.min(100, value));
}

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function daysSince(dateIso: string | null): number | null {
	if (!dateIso) return null;

	const date = new Date(`${dateIso}T00:00:00`);
	if (Number.isNaN(date.getTime())) return null;

	const now = new Date();
	const nowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const diffMs = nowUtc.getTime() - date.getTime();

	return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function buildScaleLabel(item: ClassRow): string {
	return `${item.score_min}–${item.score_max} • dec ${item.score_decimals}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = getAuthenticatedUserId(locals);

	if (!userId) {
		return {
			classes: [] as DashboardClassCard[],
			actionQueue: [] as ActionQueueItem[],
			summary: {
				displayName: 'Professor',
				totalClasses: 0,
				totalStudents: 0,
				totalRiskStudents: 0,
				totalPendingCells: 0,
				classesNeedingSnapshot: 0,
				classesAtRisk: 0,
				classesInSetup: 0,
				healthyClasses: 0,
				message: 'Sessão inválida. Faça login novamente.'
			},
			error: 'Sessão inválida. Faça login novamente.'
		};
	}

	const { data: profileData } = await locals.supabase
		.from('profiles')
		.select('display_name')
		.eq('id', userId)
		.maybeSingle<{ display_name: string }>();

	const displayName = profileData?.display_name?.trim() || 'Professor';

	const { data: classesData, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, name, created_at, score_min, score_max, score_decimals')
		.eq('teacher_id', userId)
		.order('created_at', { ascending: false });

	if (classesError) {
		return {
			classes: [] as DashboardClassCard[],
			actionQueue: [] as ActionQueueItem[],
			summary: {
				displayName,
				totalClasses: 0,
				totalStudents: 0,
				totalRiskStudents: 0,
				totalPendingCells: 0,
				classesNeedingSnapshot: 0,
				classesAtRisk: 0,
				classesInSetup: 0,
				healthyClasses: 0,
				message: 'Houve erro ao carregar as turmas.'
			},
			error: classesError.message
		};
	}

	const classRows = (classesData ?? []) as ClassRow[];
	const classIds = classRows.map((item) => item.id);

	if (classIds.length === 0) {
		return {
			classes: [] as DashboardClassCard[],
			actionQueue: [] as ActionQueueItem[],
			summary: {
				displayName,
				totalClasses: 0,
				totalStudents: 0,
				totalRiskStudents: 0,
				totalPendingCells: 0,
				classesNeedingSnapshot: 0,
				classesAtRisk: 0,
				classesInSetup: 0,
				healthyClasses: 0,
				message: 'Pronto para transformar dados em progresso? Crie sua primeira turma.'
			},
			error: null
		};
	}

	const [{ data: studentsData }, { data: skillsData }] = await Promise.all([
		locals.supabase.from('students').select('id, name, class_id').in('class_id', classIds),
		locals.supabase
			.from('skills')
			.select('id, name, class_id, score_min, score_max, score_decimals')
			.in('class_id', classIds)
	]);

	const students = (studentsData ?? []) as StudentRow[];
	const skills = (skillsData ?? []) as SkillRow[];

	const studentIds = students.map((student) => student.id);

	let scores: ScoreRow[] = [];
	if (studentIds.length > 0) {
		const { data: scoreData } = await locals.supabase
			.from('student_skill_scores')
			.select('student_id, skill_id, score')
			.in('student_id', studentIds);

		scores = (scoreData ?? []) as ScoreRow[];
	}

	const studentsByClass = new Map<string, StudentRow[]>();
	for (const student of students) {
		const current = studentsByClass.get(student.class_id) ?? [];
		current.push(student);
		studentsByClass.set(student.class_id, current);
	}

	const skillsByClass = new Map<string, SkillRow[]>();
	const skillById = new Map<string, SkillRow>();
	for (const skill of skills) {
		const current = skillsByClass.get(skill.class_id) ?? [];
		current.push(skill);
		skillsByClass.set(skill.class_id, current);
		skillById.set(skill.id, skill);
	}

	const scoresByStudent = new Map<string, ScoreRow[]>();
	for (const score of scores) {
		const current = scoresByStudent.get(score.student_id) ?? [];
		current.push(score);
		scoresByStudent.set(score.student_id, current);
	}

	const snapshotByClass = new Map<
		string,
		{
			latestSnapshotDate: string | null;
			trendDelta: number | null;
			focusSkills: string[];
		}
	>();

	await Promise.all(
		classRows.map(async (classRow) => {
			const { data, error } = await locals.supabase.rpc('get_baseline_latest_snapshots', {
				p_class_id: classRow.id
			});

			if (error || !data) {
				snapshotByClass.set(classRow.id, {
					latestSnapshotDate: null,
					trendDelta: null,
					focusSkills: []
				});
				return;
			}

			const rows = (data ?? []) as BaselineLatestSnapshotRow[];

			const latestDates = rows
				.map((row) => row.latest_date)
				.filter((value): value is string => typeof value === 'string');

			const latestSnapshotDate =
				latestDates.length > 0 ? [...latestDates].sort((a, b) => a.localeCompare(b)).at(-1) ?? null : null;

			const deltas = rows
				.map((row) => {
					if (typeof row.latest_avg !== 'number' || typeof row.baseline_avg !== 'number') {
						return null;
					}
					return row.latest_avg - row.baseline_avg;
				})
				.filter((value): value is number => typeof value === 'number');

			const focusSkills = rows
				.filter((row) => typeof row.latest_avg === 'number')
				.sort((a, b) => (a.latest_avg ?? 0) - (b.latest_avg ?? 0))
				.slice(0, 3)
				.map((row) => row.skill_name);

			snapshotByClass.set(classRow.id, {
				latestSnapshotDate,
				trendDelta: average(deltas),
				focusSkills
			});
		})
	);

	const dashboardCards: DashboardClassCard[] = classRows.map((classRow) => {
		const classStudents = studentsByClass.get(classRow.id) ?? [];
		const classSkills = skillsByClass.get(classRow.id) ?? [];
		const classSkillIds = new Set(classSkills.map((skill) => skill.id));

		let filledScoresCount = 0;
		const normalizedClassScores: number[] = [];
		const studentAveragePercents: number[] = [];

		for (const student of classStudents) {
			const relevantScores = (scoresByStudent.get(student.id) ?? []).filter((score) =>
				classSkillIds.has(score.skill_id)
			);

			const studentPercents = relevantScores
				.map((score) => {
					const skill = skillById.get(score.skill_id);
					if (!skill) return null;

					const scale = resolveEffectiveScale(classRow, skill);
					const range = scale.max - scale.min;
					if (range <= 0) return null;

					return clampPercent(((score.score - scale.min) / range) * 100);
				})
				.filter((value): value is number => typeof value === 'number');

			filledScoresCount += relevantScores.length;
			normalizedClassScores.push(...studentPercents);

			const studentAverage = average(studentPercents);
			if (studentAverage !== null) {
				studentAveragePercents.push(studentAverage);
			}
		}

		const totalExpectedCells = classStudents.length * classSkills.length;
		const pendingCells = Math.max(0, totalExpectedCells - filledScoresCount);
		const coveragePercent =
			totalExpectedCells > 0 ? Math.round((filledScoresCount / totalExpectedCells) * 100) : 0;

		const averagePercentValue = average(normalizedClassScores);
		const averagePercent =
			averagePercentValue !== null ? Math.round(averagePercentValue) : null;

		const riskStudentsCount = studentAveragePercents.filter((value) => value < 40).length;

		const snapshot = snapshotByClass.get(classRow.id) ?? {
			latestSnapshotDate: null,
			trendDelta: null,
			focusSkills: []
		};

		const snapshotAgeDays = daysSince(snapshot.latestSnapshotDate);
		const hasAnyAcademicData = filledScoresCount > 0;
		const needsSnapshot =
			hasAnyAcademicData && (snapshot.latestSnapshotDate === null || (snapshotAgeDays ?? 0) >= 7);

		let status: DashboardClassCard['status'] = 'healthy';

		if (classStudents.length === 0 || classSkills.length === 0) {
			status = 'setup';
		} else if (
			riskStudentsCount >= Math.max(2, Math.ceil(classStudents.length * 0.25)) ||
			coveragePercent < 50
		) {
			status = 'critical';
		} else if (riskStudentsCount > 0 || coveragePercent < 85 || needsSnapshot) {
			status = 'attention';
		}

		return {
			id: classRow.id,
			name: classRow.name,
			created_at: classRow.created_at,
			scaleLabel: buildScaleLabel(classRow),
			studentsCount: classStudents.length,
			skillsCount: classSkills.length,
			filledScoresCount,
			totalExpectedCells,
			pendingCells,
			coveragePercent,
			averagePercent,
			riskStudentsCount,
			latestSnapshotDate: snapshot.latestSnapshotDate,
			needsSnapshot,
			trendDelta: snapshot.trendDelta,
			focusSkills: snapshot.focusSkills,
			status
		};
	});

	const actionQueue: ActionQueueItem[] = dashboardCards
		.flatMap((item) => {
			const queue: ActionQueueItem[] = [];

			if (item.status === 'setup' && item.studentsCount === 0) {
				queue.push({
					id: `${item.id}-students`,
					classId: item.id,
					title: `${item.name} precisa de alunos`,
					description: 'A turma existe, mas ainda não possui alunos cadastrados.',
					ctaLabel: 'Abrir turma',
					href: `/teacher/${item.id}`,
					priority: 0
				});
			}

			if (item.status === 'setup' && item.skillsCount === 0) {
				queue.push({
					id: `${item.id}-skills`,
					classId: item.id,
					title: `${item.name} precisa de skills`,
					description: 'Sem skills, a turma ainda não gera leitura pedagógica útil.',
					ctaLabel: 'Abrir turma',
					href: `/teacher/${item.id}`,
					priority: 1
				});
			}

			if (item.riskStudentsCount > 0) {
				queue.push({
					id: `${item.id}-risk`,
					classId: item.id,
					title: `${item.name} tem ${item.riskStudentsCount} aluno(s) em risco`,
					description: 'Vale revisar os lançamentos e priorizar intervenção nesta turma.',
					ctaLabel: 'Abrir turma',
					href: `/teacher/${item.id}`,
					priority: 0
				});
			}

			if (item.pendingCells > 0) {
				queue.push({
					id: `${item.id}-coverage`,
					classId: item.id,
					title: `${item.name} tem ${item.pendingCells} lançamento(s) pendente(s)`,
					description: `Cobertura atual: ${item.coveragePercent}%. Ainda há lacunas no grid de notas.`,
					ctaLabel: 'Importar notas',
					href: `/teacher/import?classId=${item.id}`,
					priority: item.coveragePercent < 60 ? 0 : 2
				});
			}

			if (item.needsSnapshot) {
				queue.push({
					id: `${item.id}-snapshot`,
					classId: item.id,
					title: `${item.name} está sem snapshot recente`,
					description:
						item.latestSnapshotDate === null
							? 'Ainda não existe histórico gerado para esta turma.'
							: `Último snapshot em ${item.latestSnapshotDate}.`,
					ctaLabel: 'Abrir turma',
					href: `/teacher/${item.id}`,
					priority: 2
				});
			}

			return queue;
		})
		.sort((a, b) => a.priority - b.priority)
		.slice(0, 6);

	const totalClasses = dashboardCards.length;
	const totalStudents = dashboardCards.reduce((sum, item) => sum + item.studentsCount, 0);
	const totalRiskStudents = dashboardCards.reduce((sum, item) => sum + item.riskStudentsCount, 0);
	const totalPendingCells = dashboardCards.reduce((sum, item) => sum + item.pendingCells, 0);
	const classesNeedingSnapshot = dashboardCards.filter((item) => item.needsSnapshot).length;
	const classesAtRisk = dashboardCards.filter(
		(item) => item.status === 'critical' || item.riskStudentsCount > 0
	).length;
	const classesInSetup = dashboardCards.filter((item) => item.status === 'setup').length;
	const healthyClasses = dashboardCards.filter((item) => item.status === 'healthy').length;

	let message = 'Seu workspace está pronto para operar.';
	if (totalClasses === 0) {
		message = 'Pronto para transformar dados em progresso? Crie sua primeira turma.';
	} else if (classesInSetup > 0) {
		message = `Você tem ${classesInSetup} turma(s) em fase de configuração.`;
	} else if (totalRiskStudents > 0) {
		message = `${totalRiskStudents} aluno(s) pedem atenção hoje em ${classesAtRisk} turma(s).`;
	} else if (classesNeedingSnapshot > 0) {
		message = `${classesNeedingSnapshot} turma(s) estão sem snapshot recente.`;
	} else if (totalPendingCells > 0) {
		message = `Há ${totalPendingCells} lançamento(s) ainda pendente(s) nas suas turmas.`;
	}

	return {
		classes: dashboardCards,
		actionQueue,
		summary: {
			displayName,
			totalClasses,
			totalStudents,
			totalRiskStudents,
			totalPendingCells,
			classesNeedingSnapshot,
			classesAtRisk,
			classesInSetup,
			healthyClasses,
			message
		},
		error: null
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
			return fail(400, { action: 'createClass', message: 'Nome da turma é obrigatório.' });
		}

		if (!Number.isFinite(scoreMin) || !Number.isFinite(scoreMax)) {
			return fail(400, {
				action: 'createClass',
				message: 'Escala inválida: min e max precisam ser numéricos.'
			});
		}

		if (!(scoreMax > scoreMin)) {
			return fail(400, {
				action: 'createClass',
				message: 'Escala inválida: max precisa ser > min.'
			});
		}

		if (!Number.isInteger(scoreDecimals) || scoreDecimals < 0 || scoreDecimals > 6) {
			return fail(400, {
				action: 'createClass',
				message: 'Decimais inválidos (0 a 6).'
			});
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createClass', message: 'Você precisa estar logado.' });
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
			return fail(400, { action: 'deleteClass', message: 'classId obrigatório.' });
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'deleteClass', message: 'Você precisa estar logado.' });
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
				message: 'classId obrigatório.'
			});
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, {
				action: 'generateClassSnapshot',
				message: 'Você precisa estar logado.'
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
				message: 'Turma não encontrada.'
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
			message: 'Snapshot gerado com sucesso.'
		};
	}
};