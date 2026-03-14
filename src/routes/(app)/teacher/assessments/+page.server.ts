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
	TeacherAssessmentAnalyticsCard,
	TeacherAssessmentCard,
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

function buildSchemaState(
	error: { code?: string; message?: string; details?: string } | null
): TeacherSchemaState {
	if (isMissingRelationError(error)) {
		return {
			ready: false,
			message:
				'O schema academico da V1 ainda nao esta disponivel neste ambiente. As tabelas de subjects/class_subjects/assessments precisam existir para esta area funcionar.'
		};
	}

	return {
		ready: false,
		message: error?.message ?? 'Nao foi possivel carregar a area de avaliacoes.'
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = getAuthenticatedUserId(locals);

	if (!userId) {
		return {
			schema: {
				ready: false,
				message: 'Sessao invalida. Faca login novamente.'
			} as TeacherSchemaState,
			classes: [] as TeacherClassOption[],
			subjects: [] as TeacherSubjectOption[],
			assessments: [] as TeacherAssessmentCard[],
			analytics: [] as TeacherAssessmentAnalyticsCard[],
			summary: {
				total: 0,
				draft: 0,
				published: 0
			}
		};
	}

	const { data: classesData, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', userId)
		.order('created_at', { ascending: false });

	if (classesError) {
		return {
			schema: buildSchemaState(classesError),
			classes: [] as TeacherClassOption[],
			subjects: [] as TeacherSubjectOption[],
			assessments: [] as TeacherAssessmentCard[],
			analytics: [] as TeacherAssessmentAnalyticsCard[],
			summary: {
				total: 0,
				draft: 0,
				published: 0
			}
		};
	}

	const classes = (classesData ?? []) as TeacherClassOption[];
	const classIds = classes.map((item) => item.id);

	if (classIds.length === 0) {
		return {
			schema: {
				ready: true,
				message: null
			} as TeacherSchemaState,
			classes,
			subjects: [] as TeacherSubjectOption[],
			assessments: [] as TeacherAssessmentCard[],
			analytics: [] as TeacherAssessmentAnalyticsCard[],
			summary: {
				total: 0,
				draft: 0,
				published: 0
			}
		};
	}

	const { data: classSubjectsData, error: classSubjectsError } = await locals.supabase
		.from('class_subjects')
		.select('class_id, subject_id, teacher_id')
		.eq('teacher_id', userId)
		.in('class_id', classIds);

	if (classSubjectsError) {
		return {
			schema: buildSchemaState(classSubjectsError),
			classes,
			subjects: [] as TeacherSubjectOption[],
			assessments: [] as TeacherAssessmentCard[],
			analytics: [] as TeacherAssessmentAnalyticsCard[],
			summary: {
				total: 0,
				draft: 0,
				published: 0
			}
		};
	}

	const classSubjects = (classSubjectsData ?? []) as ClassSubjectRow[];
	const subjectIds = [...new Set(classSubjects.map((item) => item.subject_id))];

	let subjects: TeacherSubjectOption[] = [];
	if (subjectIds.length > 0) {
		const { data: subjectsData, error: subjectsError } = await locals.supabase
			.from('subjects')
			.select('id, name, code')
			.in('id', subjectIds);

		if (subjectsError) {
			return {
				schema: buildSchemaState(subjectsError),
				classes,
				subjects: [] as TeacherSubjectOption[],
				assessments: [] as TeacherAssessmentCard[],
				analytics: [] as TeacherAssessmentAnalyticsCard[],
				summary: {
					total: 0,
					draft: 0,
					published: 0
				}
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
			schema: buildSchemaState(assessmentsError),
			classes,
			subjects,
			assessments: [] as TeacherAssessmentCard[],
			analytics: [] as TeacherAssessmentAnalyticsCard[],
			summary: {
				total: 0,
				draft: 0,
				published: 0
			}
		};
	}

	const classNameById = new Map(classes.map((item) => [item.id, item.name]));
	const subjectNameById = new Map(subjects.map((item) => [item.id, item.name]));
	const assessmentRows = (assessmentsData ?? []) as AssessmentRow[];
	const assessmentIds = assessmentRows.map((assessment) => assessment.id);

	const resultsByAssessmentId = new Map<
		string,
		{ totalResults: number; filledResults: number; excusedResults: number }
	>();
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

	const assessments = assessmentRows.map((assessment) => ({
		id: assessment.id,
		title: assessment.title,
		assessmentDate: assessment.assessment_date,
		weight: assessment.weight,
		status: assessment.status,
		publishedAt: assessment.published_at,
		classId: assessment.class_id,
		className: classNameById.get(assessment.class_id) ?? 'Turma',
		subjectId: assessment.subject_id,
		subjectName: subjectNameById.get(assessment.subject_id) ?? 'Materia',
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
			subjectName: subjectNameById.get(assessment.subject_id) ?? 'Materia',
			coveragePercent,
			averagePercent,
			riskStudentsCount,
			belowTargetCount,
			dispersionPercent,
			consistencyBand,
			tone
		};
	});

	return {
		schema: {
			ready: true,
			message: null
		} as TeacherSchemaState,
		classes,
		subjects,
		assessments,
		analytics: [...analytics]
			.sort((a, b) => a.assessmentDate.localeCompare(b.assessmentDate))
			.reverse(),
		summary: {
			total: assessments.length,
			draft: assessments.filter((item) => item.status === 'draft').length,
			published: assessments.filter((item) => item.status === 'published').length
		}
	};
};

export const actions: Actions = {
	createAssessment: async ({ request, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createAssessment', message: 'Voce precisa estar logado.' });
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
			return fail(404, { action: 'createAssessment', message: 'Turma nao encontrada.' });
		}

		const classSubject = await getOwnedClassSubject(locals, classId, subjectId, userId);
		if (!classSubject) {
			return fail(400, {
				action: 'createAssessment',
				message: 'A materia selecionada nao esta vinculada a esta turma.'
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
						'O schema academico da V1 ainda nao esta disponivel neste ambiente para criar avaliacoes.'
				});
			}

			return fail(400, { action: 'createAssessment', message: error.message });
		}

		return {
			success: true,
			action: 'createAssessment',
			message: 'Avaliacao salva como rascunho.'
		};
	}
};
