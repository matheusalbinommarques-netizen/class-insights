import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

import {
	canEditAssessment,
	canPublishAssessment,
	validateAssessmentInput,
	validateAssessmentResultDraft
} from '$lib/server/assessments';
import { getAuthenticatedUserId } from '$lib/server/auth';
import { buildAssessmentRevisionTitle, buildPublicationMetadata } from '$lib/server/publication';
import {
	listTeacherInviteCodesByClass,
	mapInviteCodesByStudentId
} from '$lib/server/teacher-invite-codes';
import { getOwnedAssessment, getOwnedStudent } from '$lib/server/teacher';

type StudentRow = {
	id: string;
	name: string;
	invite_code: string | null;
};

type AssessmentResultRow = {
	id: string;
	assessment_id: string;
	student_id: string;
	raw_score: number | null;
	score_min: number;
	score_max: number;
	score_decimals: number;
	is_excused: boolean;
	notes: string | null;
	created_at: string;
	updated_at?: string;
};

type AuditRow = {
	id: string;
	created_at: string;
	assessment_result_id: string | null;
	student_id: string | null;
	changed_by: string | null;
	action_type: 'result_created' | 'result_updated' | 'result_deleted' | 'assessment_published';
	previous_score: number | null;
	next_score: number | null;
	reason: string | null;
	metadata: Record<string, unknown>;
};

type ProfileRow = {
	id: string;
	display_name: string;
};

type HistoricalAssessmentRow = {
	id: string;
	title: string;
	assessment_date: string;
};

type HistoricalResultRow = {
	assessment_id: string;
	student_id: string;
	raw_score: number | null;
	score_min: number;
	score_max: number;
	is_excused: boolean;
};

type ReviewStudentRow = {
	studentId: string;
	studentName: string;
	inviteCode: string | null;
	rawScore: number | null;
	normalizedPercent: number | null;
	hasSavedResult: boolean;
	isExcused: boolean;
	riskTone: 'critical' | 'attention' | 'healthy' | 'pending';
	classAveragePercent: number | null;
	gapPercent: number | null;
	latestReferencePercent: number | null;
	deltaFromReference: number | null;
};

type EmptyAuditItem = {
	id: string;
	created_at: string;
	action_type: AuditRow['action_type'];
	student_name: string | null;
	changed_by_name: string | null;
	previous_score: number | null;
	next_score: number | null;
	reason: string | null;
};

function toNumber(value: FormDataEntryValue | null): number {
	return Number(
		String(value ?? '')
			.trim()
			.replace(',', '.')
	);
}

function roundTo(value: number, decimals = 1) {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizePercent(rawScore: number | null, min: number, max: number): number | null {
	if (typeof rawScore !== 'number') return null;

	const range = max - min;
	if (range <= 0) return null;

	return Math.max(0, Math.min(100, ((rawScore - min) / range) * 100));
}

function classifyRiskTone(value: number | null): ReviewStudentRow['riskTone'] {
	if (typeof value !== 'number') return 'pending';
	if (value < 50) return 'critical';
	if (value < 70) return 'attention';
	return 'healthy';
}

function buildEmptyReview() {
	return {
		distribution: {
			filledCount: 0,
			excusedCount: 0,
			pendingCount: 0,
			averagePercent: null as number | null,
			lowestPercent: null as number | null,
			highestPercent: null as number | null,
			bands: [
				{ id: 'critical', label: 'Abaixo de 50%', count: 0, tone: 'critical' as const },
				{ id: 'attention', label: '50% a 69,9%', count: 0, tone: 'attention' as const },
				{ id: 'healthy', label: '70% a 84,9%', count: 0, tone: 'ready' as const },
				{ id: 'strong', label: '85% ou mais', count: 0, tone: 'published' as const }
			]
		},
		pendingStudents: [] as Array<{
			studentId: string;
			studentName: string;
			inviteCode: string | null;
		}>,
		belowAverageStudents: [] as Array<{
			studentId: string;
			studentName: string;
			inviteCode: string | null;
			rawScore: number | null;
			normalizedPercent: number;
			classAveragePercent: number;
			gapPercent: number;
			riskTone: 'critical' | 'attention' | 'healthy';
		}>,
		fallingStudents: [] as Array<{
			studentId: string;
			studentName: string;
			inviteCode: string | null;
			rawScore: number | null;
			normalizedPercent: number;
			latestReferencePercent: number;
			deltaFromReference: number;
			riskTone: 'critical' | 'attention' | 'healthy';
		}>,
		comparisonContext: {
			referenceCount: 0,
			references: [] as Array<{
				id: string;
				title: string;
				assessmentDate: string;
			}>
		}
	};
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = getAuthenticatedUserId(locals);

	if (!userId) {
		return {
			assessment: null,
			students: [] as StudentRow[],
			results: [] as AssessmentResultRow[],
			audit: [] as EmptyAuditItem[],
			summary: {
				totalStudents: 0,
				filledResults: 0,
				excusedResults: 0,
				pendingStudents: 0,
				averagePercent: null as number | null,
				belowAverageCount: 0,
				fallingStudentsCount: 0,
				previousPublishedAssessmentsCount: 0
			},
			review: buildEmptyReview()
		};
	}

	const assessment = await getOwnedAssessment(locals, params.assessmentId, userId);

	if (!assessment) {
		return {
			assessment: null,
			students: [] as StudentRow[],
			results: [] as AssessmentResultRow[],
			audit: [] as EmptyAuditItem[],
			summary: {
				totalStudents: 0,
				filledResults: 0,
				excusedResults: 0,
				pendingStudents: 0,
				averagePercent: null as number | null,
				belowAverageCount: 0,
				fallingStudentsCount: 0,
				previousPublishedAssessmentsCount: 0
			},
			review: buildEmptyReview()
		};
	}

	const [{ data: studentsData }, inviteCodesData, { data: resultsData }, { data: auditData }] =
		await Promise.all([
			locals.supabase
				.from('students')
				.select('id, name')
				.eq('class_id', assessment.class_id)
				.order('name', { ascending: true }),
			listTeacherInviteCodesByClass(locals, assessment.class_id),
			locals.supabase
				.from('assessment_results')
				.select(
					'id, assessment_id, student_id, raw_score, score_min, score_max, score_decimals, is_excused, notes, created_at, updated_at'
				)
				.eq('assessment_id', assessment.id),
			locals.supabase
				.from('grade_audit_log')
				.select(
					'id, created_at, assessment_result_id, student_id, changed_by, action_type, previous_score, next_score, reason, metadata'
				)
				.eq('assessment_id', assessment.id)
				.order('created_at', { ascending: false })
				.limit(80)
		]);

	const inviteCodesByStudentId = mapInviteCodesByStudentId(inviteCodesData);
	const students = ((studentsData ?? []) as Array<Omit<StudentRow, 'invite_code'>>)
		.map((student) => ({
			...student,
			invite_code: inviteCodesByStudentId.get(student.id) ?? null
		}))
		.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

	const results = (resultsData ?? []) as AssessmentResultRow[];
	const auditRows = (auditData ?? []) as AuditRow[];

	const profileIds = [
		...new Set(auditRows.map((item) => item.changed_by).filter(Boolean))
	] as string[];

	let profiles: ProfileRow[] = [];
	if (profileIds.length > 0) {
		const { data } = await locals.supabase
			.from('profiles')
			.select('id, display_name')
			.in('id', profileIds);

		profiles = (data ?? []) as ProfileRow[];
	}

	const studentNameById = new Map(students.map((student) => [student.id, student.name]));
	const profileNameById = new Map(
		profiles.map((profile) => [profile.id, profile.display_name || 'Usuário'])
	);

	const filledResults = results.filter(
		(result) => typeof result.raw_score === 'number' || result.is_excused
	).length;
	const excusedResults = results.filter((result) => result.is_excused).length;

	const resultByStudentId = new Map(results.map((result) => [result.student_id, result]));

	const { data: publishedReferenceAssessmentsData } = await locals.supabase
		.from('assessments')
		.select('id, title, assessment_date')
		.eq('class_id', assessment.class_id)
		.eq('subject_id', assessment.subject_id)
		.eq('status', 'published')
		.neq('id', assessment.id)
		.lte('assessment_date', assessment.assessment_date)
		.order('assessment_date', { ascending: false });

	const publishedReferenceAssessments = (publishedReferenceAssessmentsData ??
		[]) as HistoricalAssessmentRow[];

	const referenceAssessmentIds = publishedReferenceAssessments.map((item) => item.id);

	let historicalResults: HistoricalResultRow[] = [];
	if (referenceAssessmentIds.length > 0) {
		const { data } = await locals.supabase
			.from('assessment_results')
			.select('assessment_id, student_id, raw_score, score_min, score_max, is_excused')
			.in('assessment_id', referenceAssessmentIds);

		historicalResults = (data ?? []) as HistoricalResultRow[];
	}

	const latestReferencePercentByStudentId = new Map<string, number>();

	for (const result of historicalResults) {
		if (result.is_excused) continue;

		const normalized = normalizePercent(result.raw_score, result.score_min, result.score_max);
		if (typeof normalized !== 'number') continue;

		const existing = latestReferencePercentByStudentId.get(result.student_id);
		if (typeof existing === 'number') continue;

		// publishedReferenceAssessments já vem em ordem desc por data.
		// Então a primeira ocorrência válida por aluno é a referência mais recente.
		latestReferencePercentByStudentId.set(result.student_id, roundTo(normalized, 1));
	}

	const reviewRows: ReviewStudentRow[] = students.map((student) => {
		const result = resultByStudentId.get(student.id) ?? null;
		const normalizedPercentValue = result
			? normalizePercent(result.raw_score, result.score_min, result.score_max)
			: null;
		const normalizedPercent =
			typeof normalizedPercentValue === 'number' ? roundTo(normalizedPercentValue, 1) : null;
		const hasSavedResult = Boolean(
			result && (typeof result.raw_score === 'number' || result.is_excused)
		);
		const latestReferencePercent = latestReferencePercentByStudentId.get(student.id) ?? null;

		return {
			studentId: student.id,
			studentName: student.name,
			inviteCode: student.invite_code,
			rawScore: result?.raw_score ?? null,
			normalizedPercent,
			hasSavedResult,
			isExcused: result?.is_excused ?? false,
			riskTone: classifyRiskTone(normalizedPercent),
			classAveragePercent: null,
			gapPercent: null,
			latestReferencePercent,
			deltaFromReference:
				typeof normalizedPercent === 'number' && typeof latestReferencePercent === 'number'
					? roundTo(normalizedPercent - latestReferencePercent, 1)
					: null
		};
	});

	const validPercents = reviewRows
		.map((item) => item.normalizedPercent)
		.filter((value): value is number => typeof value === 'number');

	const averagePercent =
		typeof average(validPercents) === 'number' ? roundTo(average(validPercents) ?? 0, 1) : null;
	const lowestPercent = validPercents.length > 0 ? Math.min(...validPercents) : null;
	const highestPercent = validPercents.length > 0 ? Math.max(...validPercents) : null;

	for (const row of reviewRows) {
		row.classAveragePercent = averagePercent;
		row.gapPercent =
			typeof row.normalizedPercent === 'number' && typeof averagePercent === 'number'
				? roundTo(row.normalizedPercent - averagePercent, 1)
				: null;
	}

	const pendingStudents = reviewRows
		.filter((row) => !row.hasSavedResult)
		.map((row) => ({
			studentId: row.studentId,
			studentName: row.studentName,
			inviteCode: row.inviteCode
		}));

	const belowAverageStudents = reviewRows
		.filter(
			(
				row
			): row is ReviewStudentRow & {
				normalizedPercent: number;
				classAveragePercent: number;
				gapPercent: number;
				riskTone: 'critical' | 'attention' | 'healthy';
			} =>
				typeof row.normalizedPercent === 'number' &&
				typeof row.classAveragePercent === 'number' &&
				typeof row.gapPercent === 'number' &&
				row.normalizedPercent < row.classAveragePercent &&
				row.riskTone !== 'pending'
		)
		.sort((left, right) => left.gapPercent - right.gapPercent)
		.map((row) => ({
			studentId: row.studentId,
			studentName: row.studentName,
			inviteCode: row.inviteCode,
			rawScore: row.rawScore,
			normalizedPercent: row.normalizedPercent,
			classAveragePercent: row.classAveragePercent,
			gapPercent: row.gapPercent,
			riskTone: row.riskTone
		}));

	const fallingStudents = reviewRows
		.filter(
			(
				row
			): row is ReviewStudentRow & {
				normalizedPercent: number;
				latestReferencePercent: number;
				deltaFromReference: number;
				riskTone: 'critical' | 'attention' | 'healthy';
			} =>
				typeof row.normalizedPercent === 'number' &&
				typeof row.latestReferencePercent === 'number' &&
				typeof row.deltaFromReference === 'number' &&
				row.deltaFromReference <= -5 &&
				row.riskTone !== 'pending'
		)
		.sort((left, right) => left.deltaFromReference - right.deltaFromReference)
		.map((row) => ({
			studentId: row.studentId,
			studentName: row.studentName,
			inviteCode: row.inviteCode,
			rawScore: row.rawScore,
			normalizedPercent: row.normalizedPercent,
			latestReferencePercent: row.latestReferencePercent,
			deltaFromReference: row.deltaFromReference,
			riskTone: row.riskTone
		}));

	const distributionBands = [
		{
			id: 'critical',
			label: 'Abaixo de 50%',
			count: validPercents.filter((value) => value < 50).length,
			tone: 'critical' as const
		},
		{
			id: 'attention',
			label: '50% a 69,9%',
			count: validPercents.filter((value) => value >= 50 && value < 70).length,
			tone: 'attention' as const
		},
		{
			id: 'healthy',
			label: '70% a 84,9%',
			count: validPercents.filter((value) => value >= 70 && value < 85).length,
			tone: 'ready' as const
		},
		{
			id: 'strong',
			label: '85% ou mais',
			count: validPercents.filter((value) => value >= 85).length,
			tone: 'published' as const
		}
	];

	return {
		assessment,
		students,
		results,
		audit: auditRows.map((item) => ({
			id: item.id,
			created_at: item.created_at,
			action_type: item.action_type,
			student_name: item.student_id ? (studentNameById.get(item.student_id) ?? null) : null,
			changed_by_name: item.changed_by ? (profileNameById.get(item.changed_by) ?? 'Usuário') : null,
			previous_score: item.previous_score,
			next_score: item.next_score,
			reason: item.reason
		})),
		summary: {
			totalStudents: students.length,
			filledResults,
			excusedResults,
			pendingStudents: Math.max(0, students.length - filledResults),
			averagePercent,
			belowAverageCount: belowAverageStudents.length,
			fallingStudentsCount: fallingStudents.length,
			previousPublishedAssessmentsCount: publishedReferenceAssessments.length
		},
		review: {
			distribution: {
				filledCount: validPercents.length,
				excusedCount: excusedResults,
				pendingCount: Math.max(0, students.length - filledResults),
				averagePercent,
				lowestPercent: lowestPercent !== null ? roundTo(lowestPercent, 1) : null,
				highestPercent: highestPercent !== null ? roundTo(highestPercent, 1) : null,
				bands: distributionBands
			},
			pendingStudents,
			belowAverageStudents,
			fallingStudents,
			comparisonContext: {
				referenceCount: publishedReferenceAssessments.length,
				references: publishedReferenceAssessments.slice(0, 3).map((item) => ({
					id: item.id,
					title: item.title,
					assessmentDate: item.assessment_date
				}))
			}
		}
	};
};

export const actions: Actions = {
	updateAssessment: async ({ request, params, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'updateAssessment', message: 'Voce precisa estar logado.' });
		}

		const assessment = await getOwnedAssessment(locals, params.assessmentId, userId);
		if (!assessment) {
			return fail(404, { action: 'updateAssessment', message: 'Avaliacao nao encontrada.' });
		}

		if (!canEditAssessment(assessment)) {
			return fail(400, {
				action: 'updateAssessment',
				message: 'Avaliacao publicada nao pode mais ser editada.'
			});
		}

		const form = await request.formData();
		const validation = validateAssessmentInput({
			class_id: assessment.class_id,
			subject_id: assessment.subject_id,
			title: String(form.get('title') ?? '').trim(),
			assessment_date: String(form.get('assessment_date') ?? '').trim(),
			weight: toNumber(form.get('weight')),
			status: assessment.status
		});

		if (!validation.ok) {
			return fail(400, { action: 'updateAssessment', message: validation.message });
		}

		const { error } = await locals.supabase
			.from('assessments')
			.update({
				title: validation.value.title,
				assessment_date: validation.value.assessment_date,
				weight: validation.value.weight
			})
			.eq('id', assessment.id);

		if (error) {
			return fail(400, { action: 'updateAssessment', message: error.message });
		}

		return {
			success: true,
			action: 'updateAssessment',
			message: 'Metadados da avaliacao salvos com sucesso.'
		};
	},

	saveResult: async ({ request, params, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'saveResult', message: 'Voce precisa estar logado.' });
		}

		const assessment = await getOwnedAssessment(locals, params.assessmentId, userId);
		if (!assessment) {
			return fail(404, { action: 'saveResult', message: 'Avaliacao nao encontrada.' });
		}

		if (!canEditAssessment(assessment)) {
			return fail(400, {
				action: 'saveResult',
				message: 'Avaliacao publicada nao pode mais receber edicoes.'
			});
		}

		const form = await request.formData();
		const studentId = String(form.get('student_id') ?? '').trim();
		const rawScore = String(form.get('raw_score') ?? '');
		const notes = String(form.get('notes') ?? '');
		const isExcused = form.get('is_excused') === 'on';

		if (!studentId) {
			return fail(400, { action: 'saveResult', message: 'Aluno invalido.' });
		}

		const student = await getOwnedStudent(locals, assessment.class_id, studentId);
		if (!student) {
			return fail(404, { action: 'saveResult', message: 'Aluno nao encontrado na turma.' });
		}

		const validation = validateAssessmentResultDraft({
			raw_score: rawScore,
			score_min: assessment.class_score_min,
			score_max: assessment.class_score_max,
			score_decimals: assessment.class_score_decimals,
			is_excused: isExcused,
			notes
		});

		if (!validation.ok) {
			return fail(400, { action: 'saveResult', message: validation.message, studentId });
		}

		if (validation.value.shouldDelete) {
			const { error } = await locals.supabase
				.from('assessment_results')
				.delete()
				.eq('assessment_id', assessment.id)
				.eq('student_id', studentId);

			if (error) {
				return fail(400, { action: 'saveResult', message: error.message, studentId });
			}

			return {
				success: true,
				action: 'saveResult',
				message: 'Linha limpa com sucesso.',
				studentId
			};
		}

		const { error } = await locals.supabase.from('assessment_results').upsert(
			{
				assessment_id: assessment.id,
				student_id: studentId,
				raw_score: validation.value.raw_score,
				score_min: validation.value.score_min,
				score_max: validation.value.score_max,
				score_decimals: validation.value.score_decimals,
				is_excused: validation.value.is_excused,
				notes: validation.value.notes
			},
			{
				onConflict: 'assessment_id,student_id'
			}
		);

		if (error) {
			return fail(400, { action: 'saveResult', message: error.message, studentId });
		}

		return {
			success: true,
			action: 'saveResult',
			message: 'Resultado salvo com sucesso.',
			studentId
		};
	},

	publishAssessment: async ({ params, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'publishAssessment', message: 'Voce precisa estar logado.' });
		}

		const assessment = await getOwnedAssessment(locals, params.assessmentId, userId);
		if (!assessment) {
			return fail(404, { action: 'publishAssessment', message: 'Avaliacao nao encontrada.' });
		}

		const { count, error: countError } = await locals.supabase
			.from('assessment_results')
			.select('id', { count: 'exact', head: true })
			.eq('assessment_id', assessment.id);

		if (countError) {
			return fail(400, { action: 'publishAssessment', message: countError.message });
		}

		const publishGuard = canPublishAssessment(assessment, { hasResults: (count ?? 0) > 0 });
		if (!publishGuard.ok) {
			return fail(400, { action: 'publishAssessment', message: publishGuard.message });
		}

		const { error } = await locals.supabase
			.from('assessments')
			.update(buildPublicationMetadata(userId))
			.eq('id', assessment.id);

		if (error) {
			return fail(400, { action: 'publishAssessment', message: error.message });
		}

		return {
			success: true,
			action: 'publishAssessment',
			message: 'Publicacao concluida.'
		};
	},

	deleteAssessment: async ({ params, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'deleteAssessment', message: 'Voce precisa estar logado.' });
		}

		const assessment = await getOwnedAssessment(locals, params.assessmentId, userId);
		if (!assessment) {
			return fail(404, { action: 'deleteAssessment', message: 'Avaliacao nao encontrada.' });
		}

		if (!canEditAssessment(assessment)) {
			return fail(400, {
				action: 'deleteAssessment',
				message: 'Apenas rascunhos podem ser excluidos.'
			});
		}

		const { error } = await locals.supabase.from('assessments').delete().eq('id', assessment.id);

		if (error) {
			return fail(400, { action: 'deleteAssessment', message: error.message });
		}

		throw redirect(303, '/teacher/assessments');
	},

	createRevision: async ({ params, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createRevision', message: 'Voce precisa estar logado.' });
		}

		const assessment = await getOwnedAssessment(locals, params.assessmentId, userId);
		if (!assessment) {
			return fail(404, { action: 'createRevision', message: 'Avaliacao nao encontrada.' });
		}

		if (assessment.status !== 'published') {
			return fail(400, {
				action: 'createRevision',
				message: 'Apenas avaliacoes publicadas podem abrir uma correcao.'
			});
		}

		const { data, error } = await locals.supabase.rpc('create_assessment_revision', {
			p_assessment_id: assessment.id,
			p_title: buildAssessmentRevisionTitle(assessment.title)
		});

		if (error || !data) {
			return fail(400, {
				action: 'createRevision',
				message: error?.message ?? 'Nao foi possivel criar o rascunho de correcao.'
			});
		}

		throw redirect(303, `/teacher/assessments/${data}`);
	}
};
