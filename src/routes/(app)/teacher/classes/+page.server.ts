import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

import { getAuthenticatedUserId } from '$lib/server/auth';
import { buildTeacherDashboardPageData } from '$lib/server/teacher-dashboard';
import type {
	TeacherDashboardClassSummaryItem,
	TeacherDashboardPageData,
	TeacherDashboardRiskTone
} from '$lib/types/teacher';

type SummaryMetricTone = 'neutral' | 'attention' | 'critical';

type SummaryMetric = {
	label: string;
	value: string;
	tone: SummaryMetricTone;
};

type TeacherClassHealthStatus = 'em_operacao' | 'com_alerta' | 'sem_avaliacao' | 'sem_materia';

type TeacherClassNextAction = {
	label: string;
	href: string;
	reason: string;
};

export type TeacherClassesSummaryItem = TeacherDashboardClassSummaryItem & {
	classHealthStatus: TeacherClassHealthStatus;
	mainIssue: string;
	nextAction: TeacherClassNextAction;
};

export type TeacherClassesPageData = {
	teacherName: string;
	syncLabel: string;
	error: string | null;
	classesSummary: TeacherClassesSummaryItem[];
	urgentClasses: TeacherClassesSummaryItem[];
	summaryMetrics: SummaryMetric[];
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

function parsePtBrNumber(raw: string) {
	const normalized = raw.replace(/\s+/g, '').replace(',', '.');
	const value = Number(normalized);
	return Number.isFinite(value) ? value : null;
}

function parsePublishedAverage(label: string) {
	const [rawAverage] = label.split('/');
	return parsePtBrNumber((rawAverage ?? '').trim());
}

function parseCoverage(label: string) {
	const normalized = label.replace('%', '').trim();
	const value = Number(normalized);
	return Number.isFinite(value) ? value : null;
}

function parseTrend(label: string) {
	if (!label || label.trim().toLowerCase() === 'estável') return 0;
	return parsePtBrNumber(label.replace('+', '').trim()) ?? 0;
}

function formatPtBr(value: number, decimals = 1) {
	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}

function metricToneByCount(count: number): SummaryMetricTone {
	if (count > 0) return 'attention';
	return 'neutral';
}

function severityRank(statusTone: TeacherDashboardRiskTone) {
	if (statusTone === 'critical') return 0;
	if (statusTone === 'attention') return 1;
	return 2;
}

function sortByPriority(a: TeacherDashboardClassSummaryItem, b: TeacherDashboardClassSummaryItem) {
	const severityDiff = severityRank(a.statusTone) - severityRank(b.statusTone);
	if (severityDiff !== 0) return severityDiff;

	const trendA = parseTrend(a.trendLabel);
	const trendB = parseTrend(b.trendLabel);

	if (trendA !== trendB) return trendA - trendB;

	const coverageA = parseCoverage(a.coverageLabel);
	const coverageB = parseCoverage(b.coverageLabel);

	if (coverageA !== coverageB) return (coverageA ?? 100) - (coverageB ?? 100);

	const averageA = parsePublishedAverage(a.publishedAverageLabel);
	const averageB = parsePublishedAverage(b.publishedAverageLabel);

	if (averageA !== averageB) return (averageA ?? 10) - (averageB ?? 10);

	return a.className.localeCompare(b.className, 'pt-BR');
}

function normalizeText(value: string) {
	return value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.trim();
}

function hasTag(item: TeacherDashboardClassSummaryItem, term: string) {
	const normalizedTerm = normalizeText(term);
	return item.tags.some((tag) => normalizeText(tag).includes(normalizedTerm));
}

function deriveClassHealthStatus(item: TeacherDashboardClassSummaryItem): TeacherClassHealthStatus {
	const coverage = parseCoverage(item.coverageLabel);

	if (hasTag(item, 'sem matéria') || hasTag(item, 'sem materia')) {
		return 'sem_materia';
	}

	if ((coverage ?? 0) <= 0) {
		return 'sem_avaliacao';
	}

	if (item.statusTone === 'critical' || item.statusTone === 'attention') {
		return 'com_alerta';
	}

	return 'em_operacao';
}

function deriveMainIssue(
	item: TeacherDashboardClassSummaryItem,
	classHealthStatus: TeacherClassHealthStatus
) {
	if (classHealthStatus === 'sem_materia') {
		return 'A turma ainda não entrou no fluxo principal porque não tem matéria vinculada.';
	}

	if (classHealthStatus === 'sem_avaliacao') {
		return 'A turma ainda não tem avaliação com base suficiente para gerar leitura confiável.';
	}

	if (hasTag(item, 'rascunho')) {
		return 'Há rascunhos abertos ou cobertura parcial pedindo fechamento antes da próxima publicação.';
	}

	if (item.statusTone === 'critical') {
		return 'A turma concentra sinais críticos de cobertura, tendência ou alunos em risco.';
	}

	if (item.statusTone === 'attention') {
		return 'A turma pede atenção por tendência recente, cobertura incompleta ou risco pedagógico.';
	}

	return 'A turma está em operação, com leitura mais estável e fluxo já encaminhado.';
}

function deriveNextAction(
	item: TeacherDashboardClassSummaryItem,
	classHealthStatus: TeacherClassHealthStatus
): TeacherClassNextAction {
	if (classHealthStatus === 'sem_materia') {
		return {
			label: 'Vincular matéria',
			href: '/teacher/subjects',
			reason: 'Sem matéria, a turma não entra no ciclo oficial de avaliação e publicação.'
		};
	}

	if (classHealthStatus === 'sem_avaliacao') {
		return {
			label: 'Abrir turma',
			href: item.openHref,
			reason: 'O próximo passo é criar a primeira avaliação dentro da turma.'
		};
	}

	if (hasTag(item, 'rascunho')) {
		return {
			label: 'Fechar rascunho',
			href: item.openHref,
			reason: 'Vale revisar o que já foi iniciado antes de abrir nova frente.'
		};
	}

	if (item.statusTone === 'critical' || item.statusTone === 'attention') {
		return {
			label: 'Revisar turma',
			href: item.openHref,
			reason: 'A turma já tem base suficiente para uma leitura mais aprofundada.'
		};
	}

	return {
		label: 'Ver turma',
		href: item.openHref,
		reason: 'Acompanhe a operação e use esta turma como referência do fluxo em andamento.'
	};
}

function enrichClassSummary(item: TeacherDashboardClassSummaryItem): TeacherClassesSummaryItem {
	const classHealthStatus = deriveClassHealthStatus(item);

	return {
		...item,
		classHealthStatus,
		mainIssue: deriveMainIssue(item, classHealthStatus),
		nextAction: deriveNextAction(item, classHealthStatus)
	};
}

function buildSummaryMetrics(classesSummary: TeacherClassesSummaryItem[]): SummaryMetric[] {
	const classesWithAlert = classesSummary.filter(
		(item) => item.classHealthStatus === 'com_alerta'
	).length;
	const classesWithoutSubject = classesSummary.filter(
		(item) => item.classHealthStatus === 'sem_materia'
	).length;
	const classesInOperation = classesSummary.filter(
		(item) => item.classHealthStatus === 'em_operacao'
	).length;

	const coverageValues = classesSummary
		.map((item) => parseCoverage(item.coverageLabel))
		.filter((value): value is number => typeof value === 'number');

	const averageCoverage =
		coverageValues.length > 0
			? coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length
			: null;

	return [
		{
			label: 'Turmas',
			value: String(classesSummary.length),
			tone: 'neutral'
		},
		{
			label: 'Com alerta',
			value: String(classesWithAlert),
			tone: metricToneByCount(classesWithAlert)
		},
		{
			label: 'Sem matéria',
			value: String(classesWithoutSubject),
			tone: classesWithoutSubject > 0 ? 'critical' : 'neutral'
		},
		{
			label: 'Em operação',
			value: String(classesInOperation),
			tone: classesInOperation > 0 ? 'neutral' : 'attention'
		},
		{
			label: 'Cobertura média',
			value: averageCoverage === null ? '--' : `${formatPtBr(averageCoverage, 0)}%`,
			tone: averageCoverage !== null && averageCoverage < 70 ? 'attention' : 'neutral'
		}
	];
}

export const load: PageServerLoad = async ({ locals }) => {
	const dashboard = (await buildTeacherDashboardPageData(locals)) as TeacherDashboardPageData;

	const classesSummary = dashboard.classesSummary.map(enrichClassSummary).sort(sortByPriority);

	return {
		teacherName: dashboard.teacherName,
		syncLabel: dashboard.syncLabel,
		error: dashboard.error,
		classesSummary,
		urgentClasses: classesSummary.slice(0, 3),
		summaryMetrics: buildSummaryMetrics(classesSummary)
	} satisfies TeacherClassesPageData;
};

export const actions: Actions = {
	createClass: async ({ request, locals }) => {
		const form = await request.formData();

		const name = String(form.get('name') ?? '').trim();
		const scoreMin = parseDecimalInput(form.get('score_min'), 0);
		const scoreMax = parseDecimalInput(form.get('score_max'), 10);
		const scoreDecimals = parseIntegerInput(form.get('score_decimals'), 0);

		if (!name) {
			return fail(400, {
				action: 'createClass',
				message: 'Informe o nome da turma.'
			});
		}

		if (!Number.isFinite(scoreMin) || !Number.isFinite(scoreMax)) {
			return fail(400, {
				action: 'createClass',
				message: 'A escala precisa ter nota mínima e máxima numéricas.'
			});
		}

		if (!(scoreMax > scoreMin)) {
			return fail(400, {
				action: 'createClass',
				message: 'A nota máxima precisa ser maior que a mínima.'
			});
		}

		if (!Number.isInteger(scoreDecimals) || scoreDecimals < 0 || scoreDecimals > 6) {
			return fail(400, {
				action: 'createClass',
				message: 'As casas decimais devem ficar entre 0 e 6.'
			});
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, {
				action: 'createClass',
				message: 'Você precisa estar logado.'
			});
		}

		const { error } = await locals.supabase.from('classes').insert({
			name,
			teacher_id: userId,
			score_min: scoreMin,
			score_max: scoreMax,
			score_decimals: scoreDecimals
		});

		if (error) {
			return fail(400, {
				action: 'createClass',
				message: error.message
			});
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
			return fail(400, {
				action: 'deleteClass',
				message: 'Informe a turma que será removida.'
			});
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, {
				action: 'deleteClass',
				message: 'Você precisa estar logado.'
			});
		}

		const { error } = await locals.supabase
			.from('classes')
			.delete()
			.eq('id', classId)
			.eq('teacher_id', userId);

		if (error) {
			return fail(400, {
				action: 'deleteClass',
				message: error.message
			});
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
				message: 'Informe a turma para atualizar a leitura.'
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
			message: 'Leitura da turma atualizada com sucesso.'
		};
	}
};
