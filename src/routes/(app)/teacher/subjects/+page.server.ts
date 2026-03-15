import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

import { getAuthenticatedUserId } from '$lib/server/auth';
import {
	buildSubjectsSchemaMessage,
	validateClassSubjectLinkInput,
	validateSubjectInput
} from '$lib/server/subjects';
import {
	average,
	isBelowAttentionThreshold,
	normalizeResultPercent
} from '$lib/server/teacher-analytics';
import { getOwnedClass } from '$lib/server/teacher';

import type {
	TeacherClassOption,
	TeacherSchemaState,
	TeacherSubjectActionItem,
	TeacherSubjectCatalogItem,
	TeacherSubjectOption,
	TeacherSubjectsPageData,
	TeacherSubjectsSummaryMetric
} from '$lib/types/teacher';

type SubjectRow = {
	id: string;
	name: string;
	code: string | null;
};

type ClassSubjectRow = {
	class_id: string;
	subject_id: string;
	teacher_id: string;
};

type AssessmentRow = {
	id: string;
	title: string;
	status: 'draft' | 'published';
	class_id: string;
	subject_id: string;
	assessment_date: string;
	published_at: string | null;
};

type AssessmentResultRow = {
	assessment_id: string;
	raw_score: number | null;
	score_min: number;
	score_max: number;
	is_excused: boolean;
};

type AssessmentSummary = {
	totalResults: number;
	filledResults: number;
	averagePercent: number | null;
};

function emptyPageData(
	message = 'Sessão inválida. Faça login novamente.'
): TeacherSubjectsPageData {
	return {
		schema: {
			ready: false,
			message
		} as TeacherSchemaState,
		classes: [],
		subjectOptions: [],
		summaryMetrics: [
			{ label: 'Matérias cadastradas', value: '0', tone: 'neutral' },
			{ label: 'Vínculos ativos', value: '0', tone: 'neutral' },
			{ label: 'Sem avaliação', value: '0', tone: 'neutral' },
			{ label: 'Em atenção', value: '0', tone: 'neutral' },
			{ label: 'Cobertura baixa', value: '0', tone: 'neutral' }
		],
		actionItems: [],
		catalog: []
	};
}

function formatPtBrNumber(value: number, decimals = 1) {
	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}

function formatGradeFromPercent(value: number | null) {
	if (typeof value !== 'number') return '--';
	return `${formatPtBrNumber(value / 10, 1)} / 10`;
}

function buildSummaryMetric(
	label: string,
	value: string,
	tone: TeacherSubjectsSummaryMetric['tone'] = 'neutral'
): TeacherSubjectsSummaryMetric {
	return { label, value, tone };
}

function subjectStatus(input: {
	linkedClassesCount: number;
	assessmentsCount: number;
	coveragePercent: number | null;
	averagePercent: number | null;
}) {
	if (input.linkedClassesCount === 0) {
		return {
			label: 'Sem vínculo',
			tone: 'pending' as const
		};
	}

	if (input.assessmentsCount === 0) {
		return {
			label: 'Sem avaliação',
			tone: 'pending' as const
		};
	}

	if (typeof input.coveragePercent === 'number' && input.coveragePercent < 70) {
		return {
			label: 'Cobertura baixa',
			tone: 'critical' as const
		};
	}

	if (typeof input.averagePercent === 'number' && isBelowAttentionThreshold(input.averagePercent)) {
		return {
			label: 'Em atenção',
			tone: 'attention' as const
		};
	}

	return {
		label: 'Saudável',
		tone: 'healthy' as const
	};
}

function buildInsight(input: {
	linkedClassesCount: number;
	assessmentsCount: number;
	coveragePercent: number | null;
	averagePercent: number | null;
}) {
	if (input.linkedClassesCount === 0) {
		return 'A matéria já existe, mas ainda não foi vinculada a nenhuma turma.';
	}

	if (input.assessmentsCount === 0) {
		return 'A base está pronta, mas ainda não há avaliação criada para esta matéria.';
	}

	if (typeof input.coveragePercent === 'number' && input.coveragePercent < 70) {
		return 'A cobertura média ainda está baixa; vale completar lançamentos antes de interpretar o desempenho.';
	}

	if (typeof input.averagePercent === 'number' && isBelowAttentionThreshold(input.averagePercent)) {
		return 'As publicações recentes puxaram a matéria para a faixa de atenção.';
	}

	return 'A matéria está com estrutura ativa e leitura estável no momento.';
}

function buildNextStep(input: {
	linkedClassesCount: number;
	assessmentsCount: number;
	coveragePercent: number | null;
	averagePercent: number | null;
}) {
	if (input.linkedClassesCount === 0) {
		return 'Vincule esta matéria a uma turma para começar a usá-la no fluxo oficial.';
	}

	if (input.assessmentsCount === 0) {
		return 'Crie a primeira avaliação para transformar o vínculo em operação real.';
	}

	if (typeof input.coveragePercent === 'number' && input.coveragePercent < 70) {
		return 'Complete os lançamentos pendentes das avaliações mais recentes desta matéria.';
	}

	if (typeof input.averagePercent === 'number' && isBelowAttentionThreshold(input.averagePercent)) {
		return 'Abra as avaliações publicadas e revise os resultados que puxaram a média para baixo.';
	}

	return 'Acompanhe novas avaliações e mantenha a consistência entre turmas.';
}

function actionPriority(input: {
	linkedClassesCount: number;
	assessmentsCount: number;
	coveragePercent: number | null;
	averagePercent: number | null;
}) {
	if (input.linkedClassesCount === 0) return 1000;
	if (input.assessmentsCount === 0) return 900;
	if (typeof input.coveragePercent === 'number' && input.coveragePercent < 70) {
		return 800 - input.coveragePercent;
	}
	if (typeof input.averagePercent === 'number' && isBelowAttentionThreshold(input.averagePercent)) {
		return 700 - input.averagePercent;
	}
	return 100;
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = getAuthenticatedUserId(locals);

	if (!userId) {
		return emptyPageData();
	}

	const { data: classesData, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', userId)
		.order('created_at', { ascending: false });

	if (classesError) {
		return emptyPageData(buildSubjectsSchemaMessage(classesError));
	}

	const classes = (classesData ?? []) as TeacherClassOption[];
	const classIds = classes.map((item) => item.id);

	const { data: subjectsData, error: subjectsError } = await locals.supabase
		.from('subjects')
		.select('id, name, code')
		.order('name', { ascending: true });

	if (subjectsError) {
		return {
			...emptyPageData(buildSubjectsSchemaMessage(subjectsError)),
			classes
		};
	}

	let classSubjects: ClassSubjectRow[] = [];
	if (classIds.length > 0) {
		const { data: classSubjectsData, error: classSubjectsError } = await locals.supabase
			.from('class_subjects')
			.select('class_id, subject_id, teacher_id')
			.eq('teacher_id', userId)
			.in('class_id', classIds);

		if (classSubjectsError) {
			return {
				...emptyPageData(buildSubjectsSchemaMessage(classSubjectsError)),
				classes
			};
		}

		classSubjects = (classSubjectsData ?? []) as ClassSubjectRow[];
	}

	const classNameById = new Map(classes.map((item) => [item.id, item.name]));
	const subjectRows = (subjectsData ?? []) as SubjectRow[];

	const subjectOptions: TeacherSubjectOption[] = subjectRows.map((subject) => {
		const links = classSubjects.filter((item) => item.subject_id === subject.id);

		return {
			id: subject.id,
			name: subject.name,
			code: subject.code,
			classIds: links.map((item) => item.class_id)
		};
	});

	const subjectIds = subjectRows.map((item) => item.id);

	let assessments: AssessmentRow[] = [];
	if (classIds.length > 0 && subjectIds.length > 0) {
		const { data: assessmentsData } = await locals.supabase
			.from('assessments')
			.select('id, title, status, class_id, subject_id, assessment_date, published_at')
			.in('class_id', classIds)
			.in('subject_id', subjectIds);

		assessments = (assessmentsData ?? []) as AssessmentRow[];
	}

	const assessmentIds = assessments.map((item) => item.id);
	const resultRowsByAssessmentId = new Map<string, AssessmentResultRow[]>();

	if (assessmentIds.length > 0) {
		const { data: assessmentResultsData } = await locals.supabase
			.from('assessment_results')
			.select('assessment_id, raw_score, score_min, score_max, is_excused')
			.in('assessment_id', assessmentIds);

		for (const row of (assessmentResultsData ?? []) as AssessmentResultRow[]) {
			const current = resultRowsByAssessmentId.get(row.assessment_id) ?? [];
			current.push(row);
			resultRowsByAssessmentId.set(row.assessment_id, current);
		}
	}

	const assessmentSummaryById = new Map<string, AssessmentSummary>();
	for (const assessment of assessments) {
		const rows = resultRowsByAssessmentId.get(assessment.id) ?? [];
		const normalizedScores = rows
			.filter((row) => !row.is_excused)
			.map((row) => normalizeResultPercent(row))
			.filter((value): value is number => typeof value === 'number');

		const averageValue = average(normalizedScores);

		assessmentSummaryById.set(assessment.id, {
			totalResults: rows.length,
			filledResults: rows.filter((row) => typeof row.raw_score === 'number' || row.is_excused)
				.length,
			averagePercent: averageValue === null ? null : Number(averageValue.toFixed(1))
		});
	}

	const catalog: TeacherSubjectCatalogItem[] = subjectRows.map((subject) => {
		const links = classSubjects.filter((item) => item.subject_id === subject.id);
		const subjectAssessments = assessments.filter((item) => item.subject_id === subject.id);

		const linkedClassIds = links.map((item) => item.class_id);
		const classNames = linkedClassIds
			.map((classId) => classNameById.get(classId))
			.filter((value): value is string => typeof value === 'string');

		const draftAssessmentsCount = subjectAssessments.filter(
			(item) => item.status === 'draft'
		).length;
		const publishedAssessments = subjectAssessments.filter((item) => item.status === 'published');

		const coverageValues = subjectAssessments
			.map((assessment) => {
				const summary = assessmentSummaryById.get(assessment.id);
				if (!summary || summary.totalResults === 0) return null;
				return Math.round((summary.filledResults / summary.totalResults) * 100);
			})
			.filter((value): value is number => typeof value === 'number');

		const publishedAverageValues = publishedAssessments
			.map((assessment) => assessmentSummaryById.get(assessment.id)?.averagePercent ?? null)
			.filter((value): value is number => typeof value === 'number');

		const coveragePercent =
			coverageValues.length > 0
				? Math.round(coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length)
				: null;

		const averagePercent = average(publishedAverageValues);

		const status = subjectStatus({
			linkedClassesCount: linkedClassIds.length,
			assessmentsCount: subjectAssessments.length,
			coveragePercent,
			averagePercent
		});

		const primaryActionHref =
			linkedClassIds.length === 0
				? '#link-subject'
				: subjectAssessments.length === 0
					? '/teacher/assessments#new-assessment'
					: '/teacher/assessments';

		const primaryActionLabel =
			linkedClassIds.length === 0
				? 'Vincular turma'
				: subjectAssessments.length === 0
					? 'Criar avaliação'
					: 'Ver avaliações';

		const secondaryActionHref = linkedClassIds.length > 0 ? `/teacher/classes` : null;
		const secondaryActionLabel = linkedClassIds.length > 0 ? 'Ver turmas' : null;

		return {
			id: subject.id,
			name: subject.name,
			code: subject.code,
			classIds: linkedClassIds,
			classNames,
			statusLabel: status.label,
			statusTone: status.tone,
			linkedClassesCount: linkedClassIds.length,
			assessmentsCount: subjectAssessments.length,
			publishedAssessmentsCount: publishedAssessments.length,
			draftAssessmentsCount,
			coveragePercent,
			coverageLabel: coveragePercent === null ? '--' : `${coveragePercent}%`,
			averagePercent,
			averageLabel: formatGradeFromPercent(averagePercent),
			insightLabel: buildInsight({
				linkedClassesCount: linkedClassIds.length,
				assessmentsCount: subjectAssessments.length,
				coveragePercent,
				averagePercent
			}),
			nextStepLabel: buildNextStep({
				linkedClassesCount: linkedClassIds.length,
				assessmentsCount: subjectAssessments.length,
				coveragePercent,
				averagePercent
			}),
			primaryActionHref,
			primaryActionLabel,
			secondaryActionHref,
			secondaryActionLabel,
			priorityRank: actionPriority({
				linkedClassesCount: linkedClassIds.length,
				assessmentsCount: subjectAssessments.length,
				coveragePercent,
				averagePercent
			})
		};
	});

	const actionItems: TeacherSubjectActionItem[] = [...catalog]
		.sort((left, right) => {
			if (left.priorityRank !== right.priorityRank) {
				return right.priorityRank - left.priorityRank;
			}

			return left.name.localeCompare(right.name, 'pt-BR');
		})
		.slice(0, 3)
		.map((item) => ({
			id: item.id,
			name: item.name,
			code: item.code,
			statusLabel: item.statusLabel,
			statusTone: item.statusTone,
			classNames: item.classNames,
			linkedClassesLabel: `${item.linkedClassesCount} vínculo(s)`,
			assessmentsLabel: `${item.assessmentsCount} avaliação(ões)`,
			coverageLabel: item.coverageLabel,
			averageLabel: item.averageLabel,
			nextStepText: item.nextStepLabel,
			primaryActionHref: item.primaryActionHref,
			primaryActionLabel: item.primaryActionLabel,
			secondaryActionHref: item.secondaryActionHref,
			secondaryActionLabel: item.secondaryActionLabel
		}));

	const withoutAssessmentCount = catalog.filter((item) => item.assessmentsCount === 0).length;
	const attentionCount = catalog.filter((item) => item.statusTone === 'attention').length;
	const lowCoverageCount = catalog.filter(
		(item) => typeof item.coveragePercent === 'number' && item.coveragePercent < 70
	).length;

	const summaryMetrics: TeacherSubjectsSummaryMetric[] = [
		buildSummaryMetric('Matérias cadastradas', String(catalog.length)),
		buildSummaryMetric('Vínculos ativos', String(classSubjects.length)),
		buildSummaryMetric(
			'Sem avaliação',
			String(withoutAssessmentCount),
			withoutAssessmentCount > 0 ? 'attention' : 'neutral'
		),
		buildSummaryMetric(
			'Em atenção',
			String(attentionCount),
			attentionCount > 0 ? 'attention' : 'neutral'
		),
		buildSummaryMetric(
			'Cobertura baixa',
			String(lowCoverageCount),
			lowCoverageCount > 0 ? 'critical' : 'neutral'
		)
	];

	return {
		schema: {
			ready: true,
			message: null
		} as TeacherSchemaState,
		classes,
		subjectOptions,
		summaryMetrics,
		actionItems,
		catalog
	};
};

export const actions: Actions = {
	createSubject: async ({ request, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createSubject', message: 'Você precisa estar logado.' });
		}

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const code = String(form.get('code') ?? '').trim();

		const validation = validateSubjectInput({ name, code });
		if (!validation.ok) {
			return fail(400, { action: 'createSubject', message: validation.message });
		}

		const { error } = await locals.supabase.from('subjects').insert({
			name: validation.value.name,
			code: validation.value.code
		});

		if (error) {
			return fail(400, {
				action: 'createSubject',
				message: buildSubjectsSchemaMessage(error)
			});
		}

		return {
			success: true,
			action: 'createSubject',
			message: 'Matéria criada com sucesso.'
		};
	},

	linkSubjectToClass: async ({ request, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'linkSubjectToClass', message: 'Você precisa estar logado.' });
		}

		const form = await request.formData();
		const classId = String(form.get('class_id') ?? '').trim();
		const subjectId = String(form.get('subject_id') ?? '').trim();

		const validation = validateClassSubjectLinkInput({
			class_id: classId,
			subject_id: subjectId,
			teacher_id: userId
		});

		if (!validation.ok) {
			return fail(400, { action: 'linkSubjectToClass', message: validation.message });
		}

		const ownedClass = await getOwnedClass(locals, validation.value.class_id, userId);
		if (!ownedClass) {
			return fail(404, { action: 'linkSubjectToClass', message: 'Turma não encontrada.' });
		}

		const { data: existingLink } = await locals.supabase
			.from('class_subjects')
			.select('class_id')
			.eq('class_id', validation.value.class_id)
			.eq('subject_id', validation.value.subject_id)
			.eq('teacher_id', userId)
			.maybeSingle();

		if (existingLink) {
			return fail(400, {
				action: 'linkSubjectToClass',
				message: 'Esta matéria já está vinculada a esta turma.'
			});
		}

		const { error } = await locals.supabase.from('class_subjects').insert({
			class_id: validation.value.class_id,
			subject_id: validation.value.subject_id,
			teacher_id: userId
		});

		if (error) {
			return fail(400, {
				action: 'linkSubjectToClass',
				message: buildSubjectsSchemaMessage(error)
			});
		}

		return {
			success: true,
			action: 'linkSubjectToClass',
			message: 'Matéria vinculada à turma com sucesso.'
		};
	}
};
