import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

import { getAuthenticatedUserId } from '$lib/server/auth';
import { isMissingRelationError, validateAssessmentInput } from '$lib/server/assessments';
import {
	average,
	buildDispersion,
	classifyAssessmentConsistency,
	classifyAssessmentTone,
	isBelowAttentionThreshold,
	isBelowHighRiskThreshold,
	normalizeResultPercent
} from '$lib/server/teacher-analytics';
import { getOwnedClass, getOwnedClassSubject } from '$lib/server/teacher';
import type {
	TeacherAssessmentActionItem,
	TeacherAssessmentAnalyticsCard,
	TeacherAssessmentCard,
	TeacherAssessmentStatusBadgeTone,
	TeacherAssessmentTableRow,
	TeacherAssessmentsMetricTone,
	TeacherAssessmentsPageData,
	TeacherAssessmentsSummaryMetric,
	TeacherClassOption,
	TeacherSchemaState,
	TeacherSubjectOption
} from '$lib/types/teacher';

type AssessmentRow = {
	id: string;
	title: string;
	assessment_date: string;
	weight: number;
	status: 'draft' | 'published';
	published_at: string | null;
	class_id: string;
	subject_id: string;
};

type ClassSubjectRow = {
	class_id: string;
	subject_id: string;
	teacher_id: string;
};

type SubjectRow = {
	id: string;
	name: string;
	code: string | null;
};

type ResultSummaryRow = {
	assessment_id: string;
	raw_score: number | null;
	is_excused: boolean;
	score_min: number;
	score_max: number;
};

type AssessmentResultSummary = {
	totalResults: number;
	filledResults: number;
	excusedResults: number;
};

function buildSchemaState(
	error: { code?: string; message?: string; details?: string } | null
): TeacherSchemaState {
	if (isMissingRelationError(error)) {
		return {
			ready: false,
			message:
				'O schema acadêmico da V1 ainda não está disponível neste ambiente. As tabelas de subjects, class_subjects e assessments precisam existir para esta área funcionar.'
		};
	}

	return {
		ready: false,
		message: error?.message ?? 'Não foi possível carregar a área de avaliações.'
	};
}

function formatPtBrNumber(value: number, decimals = 1) {
	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}

function formatGradeFromPercent(value: number | null, withSuffix = false) {
	if (typeof value !== 'number') return '--';

	const normalized = formatPtBrNumber(value / 10, 1);
	return withSuffix ? `${normalized} / 10` : normalized;
}

function formatDateLabel(value: string | null) {
	if (!value) return '—';

	const normalized = value.includes('T') ? value : `${value}T00:00:00`;
	const date = new Date(normalized);

	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	}).format(date);
}

function buildSummaryMetric(
	label: string,
	value: string,
	tone: TeacherAssessmentsMetricTone = 'neutral'
): TeacherAssessmentsSummaryMetric {
	return { label, value, tone };
}

function actionPriority(input: {
	status: 'draft' | 'published';
	statusTone: TeacherAssessmentStatusBadgeTone;
	coveragePercent: number;
	pendingResultsCount: number;
	averagePercent: number | null;
}) {
	if (input.status === 'draft' && input.pendingResultsCount > 0) {
		return 1000 - input.coveragePercent;
	}

	if (input.statusTone === 'critical') {
		return 900;
	}

	if (input.statusTone === 'attention') {
		return 800;
	}

	if (input.statusTone === 'ready') {
		return 700;
	}

	if (input.status === 'draft') {
		return 600;
	}

	if (typeof input.averagePercent === 'number') {
		return Math.round(500 - input.averagePercent);
	}

	return 100;
}

function buildStatus(input: {
	status: 'draft' | 'published';
	coveragePercent: number;
	pendingResultsCount: number;
	analyticsTone: TeacherAssessmentAnalyticsCard['tone'];
}): {
	label: string;
	tone: TeacherAssessmentStatusBadgeTone;
} {
	const readyToPublish =
		input.status === 'draft' && input.coveragePercent === 100 && input.pendingResultsCount === 0;

	if (readyToPublish) {
		return {
			label: 'Pronta para publicar',
			tone: 'ready'
		};
	}

	if (input.status === 'draft') {
		return {
			label: 'Rascunho',
			tone: 'draft'
		};
	}

	if (input.analyticsTone === 'critical') {
		return {
			label: 'Publicada com alerta',
			tone: 'critical'
		};
	}

	if (input.analyticsTone === 'attention') {
		return {
			label: 'Publicada com atenção',
			tone: 'attention'
		};
	}

	return {
		label: 'Publicada',
		tone: 'published'
	};
}

function buildInsight(input: {
	status: 'draft' | 'published';
	coveragePercent: number;
	pendingResultsCount: number;
	averagePercent: number | null;
	analyticsTone: TeacherAssessmentAnalyticsCard['tone'];
}) {
	if (input.status === 'draft' && input.pendingResultsCount > 0) {
		return `Faltam ${input.pendingResultsCount} resultado(s) para fechar esta avaliação.`;
	}

	if (input.status === 'draft' && input.coveragePercent === 100) {
		return 'Cobertura completa; vale revisar a distribuição e publicar quando estiver pronta.';
	}

	if (input.status === 'published' && input.analyticsTone === 'critical') {
		return 'Publicada com sinal forte de risco; vale revisar a distribuição e os alunos em maior queda.';
	}

	if (input.status === 'published' && input.analyticsTone === 'attention') {
		return 'Publicada com atenção; há sinais que merecem leitura mais cuidadosa.';
	}

	if (typeof input.averagePercent === 'number' && isBelowAttentionThreshold(input.averagePercent)) {
		return 'A média publicada ficou abaixo da referência de atenção.';
	}

	return 'Sem alerta relevante no momento.';
}

function buildNextStepText(input: {
	status: 'draft' | 'published';
	pendingResultsCount: number;
	coveragePercent: number;
	analyticsTone: TeacherAssessmentAnalyticsCard['tone'];
	averagePercent: number | null;
}) {
	if (input.status === 'draft' && input.pendingResultsCount > 0) {
		return `Você ainda tem ${input.pendingResultsCount} resultado(s) pendente(s) nesta avaliação.`;
	}

	if (input.status === 'draft' && input.coveragePercent === 100) {
		return 'Cobertura completa. Revise a distribuição antes de publicar.';
	}

	if (input.status === 'published' && input.analyticsTone === 'critical') {
		return 'A avaliação já foi publicada e trouxe um alerta forte. Vale abrir e revisar os alunos mais vulneráveis.';
	}

	if (input.status === 'published' && input.analyticsTone === 'attention') {
		return 'A avaliação pede leitura complementar. Confira cobertura, média e dispersão para decidir a próxima ação.';
	}

	if (typeof input.averagePercent === 'number' && isBelowAttentionThreshold(input.averagePercent)) {
		return 'A média ficou abaixo da referência. Vale abrir a avaliação e conferir o que puxou o resultado para baixo.';
	}

	return 'A avaliação está estável e pode servir como referência para comparação com as demais.';
}

function emptyAssessmentsPageData(): TeacherAssessmentsPageData {
	return {
		schema: {
			ready: false,
			message: 'Sessão inválida. Faça login novamente.'
		},
		classes: [],
		subjects: [],
		summaryMetrics: [
			buildSummaryMetric('Avaliações', '0'),
			buildSummaryMetric('Em rascunho', '0'),
			buildSummaryMetric('Publicadas', '0'),
			buildSummaryMetric('Pendentes', '0'),
			buildSummaryMetric('Cobertura média', '--')
		],
		actionItems: [],
		rows: []
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = getAuthenticatedUserId(locals);

	if (!userId) {
		return emptyAssessmentsPageData();
	}

	const { data: classesData, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', userId)
		.order('created_at', { ascending: false });

	if (classesError) {
		return {
			...emptyAssessmentsPageData(),
			schema: buildSchemaState(classesError)
		};
	}

	const classes = (classesData ?? []) as TeacherClassOption[];
	const classIds = classes.map((item) => item.id);

	if (classIds.length === 0) {
		return {
			schema: {
				ready: true,
				message: null
			},
			classes,
			subjects: [],
			summaryMetrics: [
				buildSummaryMetric('Avaliações', '0'),
				buildSummaryMetric('Em rascunho', '0'),
				buildSummaryMetric('Publicadas', '0'),
				buildSummaryMetric('Pendentes', '0'),
				buildSummaryMetric('Cobertura média', '--')
			],
			actionItems: [],
			rows: []
		};
	}

	const { data: classSubjectsData, error: classSubjectsError } = await locals.supabase
		.from('class_subjects')
		.select('class_id, subject_id, teacher_id')
		.eq('teacher_id', userId)
		.in('class_id', classIds);

	if (classSubjectsError) {
		return {
			...emptyAssessmentsPageData(),
			schema: buildSchemaState(classSubjectsError),
			classes
		};
	}

	const classSubjects = (classSubjectsData ?? []) as ClassSubjectRow[];
	const subjectIds = [...new Set(classSubjects.map((item) => item.subject_id))];

	let subjects: TeacherSubjectOption[] = [];
	if (subjectIds.length > 0) {
		const { data: subjectsData, error: subjectsError } = await locals.supabase
			.from('subjects')
			.select('id, name, code')
			.in('id', subjectIds)
			.order('name', { ascending: true });

		if (subjectsError) {
			return {
				...emptyAssessmentsPageData(),
				schema: buildSchemaState(subjectsError),
				classes
			};
		}

		const bySubjectId = new Map(
			classSubjects.reduce<[string, string[]][]>((acc, row) => {
				const current = acc.find(([subjectId]) => subjectId === row.subject_id);

				if (current) {
					current[1].push(row.class_id);
					return acc;
				}

				acc.push([row.subject_id, [row.class_id]]);
				return acc;
			}, [])
		);

		subjects = ((subjectsData ?? []) as SubjectRow[]).map((subject) => ({
			id: subject.id,
			name: subject.name,
			code: subject.code,
			classIds: bySubjectId.get(subject.id) ?? []
		}));
	}

	const { data: assessmentsData, error: assessmentsError } = await locals.supabase
		.from('assessments')
		.select('id, title, assessment_date, weight, status, published_at, class_id, subject_id')
		.in('class_id', classIds)
		.order('assessment_date', { ascending: false });

	if (assessmentsError) {
		return {
			...emptyAssessmentsPageData(),
			schema: buildSchemaState(assessmentsError),
			classes,
			subjects
		};
	}

	const classNameById = new Map(classes.map((item) => [item.id, item.name]));
	const subjectNameById = new Map(subjects.map((item) => [item.id, item.name]));

	const assessmentRows = (assessmentsData ?? []) as AssessmentRow[];
	const assessmentIds = assessmentRows.map((assessment) => assessment.id);

	const resultsByAssessmentId = new Map<string, AssessmentResultSummary>();
	const detailedResultsByAssessmentId = new Map<string, ResultSummaryRow[]>();

	if (assessmentIds.length > 0) {
		const { data: resultsData } = await locals.supabase
			.from('assessment_results')
			.select('assessment_id, raw_score, is_excused, score_min, score_max')
			.in('assessment_id', assessmentIds);

		for (const result of (resultsData ?? []) as ResultSummaryRow[]) {
			const current = resultsByAssessmentId.get(result.assessment_id) ?? {
				totalResults: 0,
				filledResults: 0,
				excusedResults: 0
			};

			current.totalResults += 1;
			if (typeof result.raw_score === 'number' || result.is_excused) {
				current.filledResults += 1;
			}
			if (result.is_excused) {
				current.excusedResults += 1;
			}

			resultsByAssessmentId.set(result.assessment_id, current);

			const detailedCurrent = detailedResultsByAssessmentId.get(result.assessment_id) ?? [];
			detailedCurrent.push(result);
			detailedResultsByAssessmentId.set(result.assessment_id, detailedCurrent);
		}
	}

	const assessments: TeacherAssessmentCard[] = assessmentRows.map((assessment) => ({
		id: assessment.id,
		title: assessment.title,
		assessmentDate: assessment.assessment_date,
		weight: assessment.weight,
		status: assessment.status,
		publishedAt: assessment.published_at,
		classId: assessment.class_id,
		className: classNameById.get(assessment.class_id) ?? 'Turma',
		subjectId: assessment.subject_id,
		subjectName: subjectNameById.get(assessment.subject_id) ?? 'Matéria',
		filledResults: resultsByAssessmentId.get(assessment.id)?.filledResults ?? 0,
		excusedResults: resultsByAssessmentId.get(assessment.id)?.excusedResults ?? 0,
		totalResults: resultsByAssessmentId.get(assessment.id)?.totalResults ?? 0
	}));

	const analytics: TeacherAssessmentAnalyticsCard[] = assessmentRows.map((assessment) => {
		const summary = resultsByAssessmentId.get(assessment.id) ?? {
			totalResults: 0,
			filledResults: 0,
			excusedResults: 0
		};

		const normalizedScores = (detailedResultsByAssessmentId.get(assessment.id) ?? [])
			.filter((result) => !result.is_excused)
			.map((result) => normalizeResultPercent(result))
			.filter((value): value is number => typeof value === 'number');

		const averagePercentValue = average(normalizedScores);
		const averagePercent =
			averagePercentValue === null ? null : Math.round(Number(averagePercentValue.toFixed(1)));

		const dispersionPercent = buildDispersion(normalizedScores);
		const riskStudentsCount = normalizedScores.filter((value) =>
			isBelowHighRiskThreshold(value)
		).length;
		const belowTargetCount = normalizedScores.filter((value) =>
			isBelowAttentionThreshold(value)
		).length;
		const coveragePercent =
			summary.totalResults > 0
				? Math.round((summary.filledResults / summary.totalResults) * 100)
				: 0;
		const consistencyBand = classifyAssessmentConsistency(dispersionPercent);
		const tone = classifyAssessmentTone({
			totalResults: summary.totalResults,
			filledResults: summary.filledResults,
			status: assessment.status,
			coveragePercent,
			averagePercent,
			riskStudentsCount,
			belowTargetCount,
			consistencyBand
		});

		return {
			id: assessment.id,
			title: assessment.title,
			assessmentDate: assessment.assessment_date,
			status: assessment.status,
			className: classNameById.get(assessment.class_id) ?? 'Turma',
			subjectName: subjectNameById.get(assessment.subject_id) ?? 'Matéria',
			coveragePercent,
			averagePercent,
			riskStudentsCount,
			belowTargetCount,
			dispersionPercent,
			consistencyBand,
			tone
		};
	});

	const analyticsById = new Map(analytics.map((item) => [item.id, item]));

	const rows: TeacherAssessmentTableRow[] = assessments.map((assessment) => {
		const analyticsItem = analyticsById.get(assessment.id);
		const coveragePercent = analyticsItem?.coveragePercent ?? 0;
		const averagePercent = analyticsItem?.averagePercent ?? null;
		const pendingResultsCount = Math.max(assessment.totalResults - assessment.filledResults, 0);

		const statusInfo = buildStatus({
			status: assessment.status,
			coveragePercent,
			pendingResultsCount,
			analyticsTone: analyticsItem?.tone ?? 'pending'
		});

		const priorityRank = actionPriority({
			status: assessment.status,
			statusTone: statusInfo.tone,
			coveragePercent,
			pendingResultsCount,
			averagePercent
		});

		return {
			id: assessment.id,
			title: assessment.title,
			classId: assessment.classId,
			className: assessment.className,
			subjectId: assessment.subjectId,
			subjectName: assessment.subjectName,
			status: assessment.status,
			statusLabel: statusInfo.label,
			statusTone: statusInfo.tone,
			assessmentDate: assessment.assessmentDate,
			assessmentDateLabel: formatDateLabel(assessment.assessmentDate),
			coveragePercent,
			coverageLabel: `${coveragePercent}%`,
			averagePercent,
			averageLabel: formatGradeFromPercent(averagePercent),
			insightLabel: buildInsight({
				status: assessment.status,
				coveragePercent,
				pendingResultsCount,
				averagePercent,
				analyticsTone: analyticsItem?.tone ?? 'pending'
			}),
			pendingResultsCount,
			primaryActionHref: `/teacher/assessments/${assessment.id}`,
			primaryActionLabel: assessment.status === 'draft' ? 'Abrir lançamento' : 'Ver avaliação',
			priorityRank
		};
	});

	const actionItems: TeacherAssessmentActionItem[] = [...rows]
		.sort((left, right) => {
			if (left.priorityRank !== right.priorityRank) {
				return right.priorityRank - left.priorityRank;
			}

			return right.assessmentDate.localeCompare(left.assessmentDate);
		})
		.slice(0, 2)
		.map((row) => ({
			id: row.id,
			title: row.title,
			className: row.className,
			subjectName: row.subjectName,
			statusLabel: row.statusLabel,
			statusTone: row.statusTone,
			coverageLabel: row.coverageLabel,
			averageLabel: row.averageLabel,
			dateLabel: row.assessmentDateLabel,
			nextStepText: buildNextStepText({
				status: row.status,
				pendingResultsCount: row.pendingResultsCount,
				coveragePercent: row.coveragePercent,
				analyticsTone: analyticsById.get(row.id)?.tone ?? 'pending',
				averagePercent: row.averagePercent
			}),
			actionHref: row.primaryActionHref,
			actionLabel: row.primaryActionLabel
		}));

	const draftCount = rows.filter((item) => item.status === 'draft').length;
	const publishedCount = rows.filter((item) => item.status === 'published').length;
	const pendingCount = rows.filter(
		(item) => item.status === 'draft' || item.pendingResultsCount > 0
	).length;

	const averageCoverage =
		rows.length > 0
			? Math.round(rows.reduce((sum, item) => sum + item.coveragePercent, 0) / rows.length)
			: null;

	const summaryMetrics: TeacherAssessmentsSummaryMetric[] = [
		buildSummaryMetric('Avaliações', String(rows.length)),
		buildSummaryMetric('Em rascunho', String(draftCount), draftCount > 0 ? 'attention' : 'neutral'),
		buildSummaryMetric(
			'Publicadas',
			String(publishedCount),
			publishedCount > 0 ? 'positive' : 'neutral'
		),
		buildSummaryMetric(
			'Pendentes',
			String(pendingCount),
			pendingCount > 0 ? 'attention' : 'neutral'
		),
		buildSummaryMetric(
			'Cobertura média',
			averageCoverage === null ? '--' : `${averageCoverage}%`,
			'neutral'
		)
	];

	return {
		schema: {
			ready: true,
			message: null
		},
		classes,
		subjects,
		summaryMetrics,
		actionItems,
		rows
	};
};

export const actions: Actions = {
	createAssessment: async ({ request, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createAssessment', message: 'Você precisa estar logado.' });
		}

		const form = await request.formData();
		const classId = String(form.get('class_id') ?? '').trim();
		const subjectId = String(form.get('subject_id') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const assessmentDate = String(form.get('assessment_date') ?? '').trim();
		const weight = Number(String(form.get('weight') ?? '').trim());

		const validation = validateAssessmentInput({
			class_id: classId,
			subject_id: subjectId,
			title,
			assessment_date: assessmentDate,
			weight
		});

		if (!validation.ok) {
			return fail(400, { action: 'createAssessment', message: validation.message });
		}

		const ownedClass = await getOwnedClass(locals, classId, userId);
		if (!ownedClass) {
			return fail(404, { action: 'createAssessment', message: 'Turma não encontrada.' });
		}

		const classSubject = await getOwnedClassSubject(locals, classId, subjectId, userId);
		if (!classSubject) {
			return fail(400, {
				action: 'createAssessment',
				message: 'A matéria selecionada não está vinculada a esta turma.'
			});
		}

		const { error } = await locals.supabase.from('assessments').insert({
			class_id: validation.value.class_id,
			subject_id: validation.value.subject_id,
			title: validation.value.title,
			assessment_date: validation.value.assessment_date,
			weight: validation.value.weight,
			status: validation.value.status
		});

		if (error) {
			if (isMissingRelationError(error)) {
				return fail(400, {
					action: 'createAssessment',
					message:
						'O schema acadêmico da V1 ainda não está disponível neste ambiente para criar avaliações.'
				});
			}

			return fail(400, { action: 'createAssessment', message: error.message });
		}

		return {
			success: true,
			action: 'createAssessment',
			message: 'Avaliação salva como rascunho.'
		};
	}
};
