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
import { getOwnedAssessment, getOwnedStudent } from '$lib/server/teacher';

type StudentRow = {
	id: string;
	name: string;
	invite_code: string | null;
};

type InviteCodeRow = {
	student_id: string;
	code: string;
	status: 'active' | 'claimed' | 'archived';
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

function toNumber(value: FormDataEntryValue | null): number {
	return Number(
		String(value ?? '')
			.trim()
			.replace(',', '.')
	);
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = getAuthenticatedUserId(locals);

	if (!userId) {
		return {
			assessment: null,
			students: [] as StudentRow[],
			results: [] as AssessmentResultRow[],
			audit: [] as {
				id: string;
				created_at: string;
				action_type: AuditRow['action_type'];
				student_name: string | null;
				changed_by_name: string | null;
				previous_score: number | null;
				next_score: number | null;
				reason: string | null;
			}[],
			summary: {
				totalStudents: 0,
				filledResults: 0,
				excusedResults: 0,
				pendingStudents: 0
			}
		};
	}

	const assessment = await getOwnedAssessment(locals, params.assessmentId, userId);

	if (!assessment) {
		return {
			assessment: null,
			students: [] as StudentRow[],
			results: [] as AssessmentResultRow[],
			audit: [] as {
				id: string;
				created_at: string;
				action_type: AuditRow['action_type'];
				student_name: string | null;
				changed_by_name: string | null;
				previous_score: number | null;
				next_score: number | null;
				reason: string | null;
			}[],
			summary: {
				totalStudents: 0,
				filledResults: 0,
				excusedResults: 0,
				pendingStudents: 0
			}
		};
	}

	const [
		{ data: studentsData },
		{ data: inviteCodesData },
		{ data: resultsData },
		{ data: auditData }
	] = await Promise.all([
		locals.supabase
			.from('students')
			.select('id, name')
			.eq('class_id', assessment.class_id)
			.order('name', { ascending: true }),
		locals.supabase
			.from('teacher_invite_codes')
			.select('student_id, code, status')
			.eq('class_id', assessment.class_id)
			.in('status', ['active', 'claimed']),
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

	const inviteCodesByStudentId = new Map(
		((inviteCodesData ?? []) as InviteCodeRow[]).map((row) => [row.student_id, row.code])
	);
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
		profiles.map((profile) => [profile.id, profile.display_name || 'Usuario'])
	);

	const filledResults = results.filter(
		(result) => typeof result.raw_score === 'number' || result.is_excused
	).length;
	const excusedResults = results.filter((result) => result.is_excused).length;

	return {
		assessment,
		students,
		results,
		audit: auditRows.map((item) => ({
			id: item.id,
			created_at: item.created_at,
			action_type: item.action_type,
			student_name: item.student_id ? (studentNameById.get(item.student_id) ?? null) : null,
			changed_by_name: item.changed_by ? (profileNameById.get(item.changed_by) ?? 'Usuario') : null,
			previous_score: item.previous_score,
			next_score: item.next_score,
			reason: item.reason
		})),
		summary: {
			totalStudents: students.length,
			filledResults,
			excusedResults,
			pendingStudents: Math.max(0, students.length - filledResults)
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
			message: 'Avaliacao publicada com sucesso.'
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
