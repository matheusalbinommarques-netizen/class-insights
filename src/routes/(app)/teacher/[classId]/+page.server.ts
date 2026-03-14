import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

import { validateAssessmentInput } from '$lib/server/assessments';
import { getAuthenticatedUserId } from '$lib/server/auth';
import { buildSubjectLongitudinalSummaries } from '$lib/server/longitudinal';
import { validateSubjectInput } from '$lib/server/subjects';
import { getOwnedClass, getOwnedClassSubject } from '$lib/server/teacher';
import type { LongitudinalPoint, SubjectLongitudinalSummary } from '$lib/types/academic';
import type {
	TeacherClassStudent,
	TeacherClassSubjectCard,
	TeacherSubjectOption
} from '$lib/types/teacher';

type ClassSubjectRow = {
	class_id: string;
	subject_id: string;
	teacher_id: string;
	subjects:
		| {
				id: string;
				name: string;
				code: string | null;
		  }
		| {
				id: string;
				name: string;
				code: string | null;
		  }[];
};

type AssessmentRow = {
	id: string;
	title: string;
	assessment_date: string;
	weight: number;
	status: 'draft' | 'published';
	published_at: string | null;
	subject_id: string;
};

type AssessmentResultRow = {
	assessment_id: string;
	raw_score: number | null;
	score_min: number;
	score_max: number;
	is_excused: boolean;
};

type InviteCodeRow = {
	student_id: string;
	code: string;
	status: 'active' | 'claimed' | 'archived';
};

function generateInviteCode(): string {
	return crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
}

function parseNumberInput(raw: FormDataEntryValue | null): number {
	return Number(
		String(raw ?? '')
			.trim()
			.replace(',', '.')
	);
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

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = getAuthenticatedUserId(locals);

	if (!userId) {
		return {
			class: null,
			students: [] as TeacherClassStudent[],
			subjects: [] as TeacherClassSubjectCard[],
			availableSubjects: [] as TeacherSubjectOption[],
			longitudinalSubjects: [] as SubjectLongitudinalSummary[],
			summary: {
				totalStudents: 0,
				totalSubjects: 0,
				totalAssessments: 0,
				draftAssessments: 0
			}
		};
	}

	const ownedClass = await getOwnedClass(locals, params.classId, userId);

	if (!ownedClass) {
		return {
			class: null,
			students: [] as TeacherClassStudent[],
			subjects: [] as TeacherClassSubjectCard[],
			availableSubjects: [] as TeacherSubjectOption[],
			longitudinalSubjects: [] as SubjectLongitudinalSummary[],
			summary: {
				totalStudents: 0,
				totalSubjects: 0,
				totalAssessments: 0,
				draftAssessments: 0
			}
		};
	}

	const [
		{ data: studentsData },
		{ data: inviteCodesData },
		{ data: classSubjectsData },
		{ data: allSubjectsData }
	] = await Promise.all([
		locals.supabase
			.from('students')
			.select('id, name, created_at')
			.eq('class_id', ownedClass.id)
			.order('created_at', { ascending: true }),
		locals.supabase
			.from('teacher_invite_codes')
			.select('student_id, code, status')
			.eq('class_id', ownedClass.id)
			.in('status', ['active', 'claimed']),
		locals.supabase
			.from('class_subjects')
			.select(
				`
						class_id,
						subject_id,
						teacher_id,
						subjects!inner (
							id,
							name,
							code
						)
					`
			)
			.eq('class_id', ownedClass.id)
			.eq('teacher_id', userId),
		locals.supabase.from('subjects').select('id, name, code').order('name', { ascending: true })
	]);

	const inviteCodesByStudentId = new Map(
		((inviteCodesData ?? []) as InviteCodeRow[]).map((row) => [row.student_id, row.code])
	);
	const students = ((studentsData ?? []) as Array<Omit<TeacherClassStudent, 'invite_code'>>).map(
		(student) => ({
			...student,
			invite_code: inviteCodesByStudentId.get(student.id) ?? null
		})
	);
	const classSubjects = ((classSubjectsData ?? []) as ClassSubjectRow[])
		.map((item) => {
			const subject = Array.isArray(item.subjects) ? item.subjects[0] : item.subjects;
			if (!subject) return null;

			return {
				class_id: item.class_id,
				subject_id: item.subject_id,
				teacher_id: item.teacher_id,
				subject
			};
		})
		.filter(
			(
				item
			): item is {
				class_id: string;
				subject_id: string;
				teacher_id: string;
				subject: {
					id: string;
					name: string;
					code: string | null;
				};
			} => item !== null
		);
	const availableSubjects = (allSubjectsData ?? []) as TeacherSubjectOption[];

	const subjectIds = classSubjects.map((item) => item.subject_id);

	let assessments: AssessmentRow[] = [];
	const resultsByAssessmentId = new Map<string, number>();
	let longitudinalSubjects: SubjectLongitudinalSummary[] = [];

	if (subjectIds.length > 0) {
		const { data: assessmentsData } = await locals.supabase
			.from('assessments')
			.select('id, title, assessment_date, weight, status, published_at, subject_id')
			.eq('class_id', ownedClass.id)
			.in('subject_id', subjectIds)
			.order('assessment_date', { ascending: false });

		assessments = (assessmentsData ?? []) as AssessmentRow[];

		if (assessments.length > 0) {
			const { data: resultsData } = await locals.supabase
				.from('assessment_results')
				.select('assessment_id, raw_score, score_min, score_max, is_excused')
				.in(
					'assessment_id',
					assessments.map((item) => item.id)
				);

			const assessmentResults = (resultsData ?? []) as AssessmentResultRow[];
			const resultsForLongitudinal = new Map<string, AssessmentResultRow[]>();

			for (const row of assessmentResults) {
				resultsByAssessmentId.set(
					row.assessment_id,
					(resultsByAssessmentId.get(row.assessment_id) ?? 0) + 1
				);

				const current = resultsForLongitudinal.get(row.assessment_id) ?? [];
				current.push(row);
				resultsForLongitudinal.set(row.assessment_id, current);
			}

			const publishedTimeline: LongitudinalPoint[] = assessments
				.filter((assessment) => assessment.status === 'published')
				.map((assessment) => {
					const normalizedValues = (resultsForLongitudinal.get(assessment.id) ?? [])
						.filter((result) => !result.is_excused)
						.map((result) => normalizePercent(result.raw_score, result.score_min, result.score_max))
						.filter((value): value is number => typeof value === 'number');
					const subject = classSubjects.find(
						(item) => item.subject_id === assessment.subject_id
					)?.subject;
					const normalizedAverage = average(normalizedValues);

					return {
						assessment_id: assessment.id,
						assessment_title: assessment.title,
						assessment_date: assessment.assessment_date,
						subject_id: assessment.subject_id,
						subject_name: subject?.name ?? 'Materia',
						raw_score: normalizedAverage,
						normalized_percent:
							normalizedAverage === null ? null : Number(normalizedAverage.toFixed(2)),
						status: assessment.status
					};
				});

			longitudinalSubjects = buildSubjectLongitudinalSummaries(publishedTimeline);
		}
	}

	const subjects: TeacherClassSubjectCard[] = classSubjects
		.map((item) => ({
			id: item.subject.id,
			name: item.subject.name,
			code: item.subject.code,
			assessments: assessments
				.filter((assessment) => assessment.subject_id === item.subject_id)
				.map((assessment) => ({
					id: assessment.id,
					title: assessment.title,
					assessmentDate: assessment.assessment_date,
					weight: assessment.weight,
					status: assessment.status,
					publishedAt: assessment.published_at,
					resultsCount: resultsByAssessmentId.get(assessment.id) ?? 0
				}))
		}))
		.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

	return {
		class: ownedClass,
		students,
		subjects,
		availableSubjects,
		longitudinalSubjects,
		summary: {
			totalStudents: students.length,
			totalSubjects: subjects.length,
			totalAssessments: assessments.length,
			draftAssessments: assessments.filter((assessment) => assessment.status === 'draft').length,
			publishedAssessments: assessments.filter((assessment) => assessment.status === 'published')
				.length
		}
	};
};

export const actions: Actions = {
	createStudent: async ({ request, params, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();

		if (!name) {
			return fail(400, { action: 'createStudent', message: 'Nome do aluno e obrigatorio.' });
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createStudent', message: 'Voce precisa estar logado.' });
		}

		const ownedClass = await getOwnedClass(locals, params.classId, userId);
		if (!ownedClass) {
			return fail(404, { action: 'createStudent', message: 'Turma nao encontrada.' });
		}

		const inviteCode = generateInviteCode();
		const { data: createdStudent, error: studentError } = await locals.supabase
			.from('students')
			.insert({
				name,
				class_id: ownedClass.id
			})
			.select('id')
			.single<{ id: string }>();

		if (studentError || !createdStudent) {
			return fail(400, {
				action: 'createStudent',
				message: studentError?.message ?? 'Nao foi possivel criar o aluno.'
			});
		}

		const { error: inviteCodeError } = await locals.supabase.from('teacher_invite_codes').insert({
			code: inviteCode,
			student_id: createdStudent.id,
			class_id: ownedClass.id,
			teacher_id: userId,
			status: 'active'
		});

		if (inviteCodeError) {
			return fail(400, { action: 'createStudent', message: inviteCodeError.message });
		}

		return { success: true, action: 'createStudent', message: 'Aluno criado com sucesso.' };
	},

	createSubject: async ({ request, params, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createSubject', message: 'Voce precisa estar logado.' });
		}

		const ownedClass = await getOwnedClass(locals, params.classId, userId);
		if (!ownedClass) {
			return fail(404, { action: 'createSubject', message: 'Turma nao encontrada.' });
		}

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const code = String(form.get('code') ?? '').trim();

		const validation = validateSubjectInput({ name, code });
		if (!validation.ok) {
			return fail(400, { action: 'createSubject', message: validation.message });
		}

		const { data: createdSubject, error: subjectError } = await locals.supabase
			.from('subjects')
			.insert({
				name: validation.value.name,
				code: validation.value.code,
				created_by: userId
			})
			.select('id')
			.single<{ id: string }>();

		if (subjectError || !createdSubject) {
			return fail(400, {
				action: 'createSubject',
				message: subjectError?.message ?? 'Nao foi possivel criar a materia.'
			});
		}

		const { error: linkError } = await locals.supabase.from('class_subjects').insert({
			class_id: ownedClass.id,
			subject_id: createdSubject.id,
			teacher_id: userId
		});

		if (linkError) {
			return fail(400, { action: 'createSubject', message: linkError.message });
		}

		return {
			success: true,
			action: 'createSubject',
			message: 'Materia criada e vinculada a turma com sucesso.'
		};
	},

	linkSubject: async ({ request, params, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'linkSubject', message: 'Voce precisa estar logado.' });
		}

		const ownedClass = await getOwnedClass(locals, params.classId, userId);
		if (!ownedClass) {
			return fail(404, { action: 'linkSubject', message: 'Turma nao encontrada.' });
		}

		const form = await request.formData();
		const subjectId = String(form.get('subject_id') ?? '').trim();

		if (!subjectId) {
			return fail(400, { action: 'linkSubject', message: 'Materia invalida.' });
		}

		const { error } = await locals.supabase.from('class_subjects').upsert(
			{
				class_id: ownedClass.id,
				subject_id: subjectId,
				teacher_id: userId
			},
			{ onConflict: 'class_id,subject_id' }
		);

		if (error) {
			return fail(400, { action: 'linkSubject', message: error.message });
		}

		return { success: true, action: 'linkSubject', message: 'Materia vinculada a turma.' };
	},

	createAssessment: async ({ request, params, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createAssessment', message: 'Voce precisa estar logado.' });
		}

		const ownedClass = await getOwnedClass(locals, params.classId, userId);
		if (!ownedClass) {
			return fail(404, { action: 'createAssessment', message: 'Turma nao encontrada.' });
		}

		const form = await request.formData();
		const validation = validateAssessmentInput({
			class_id: ownedClass.id,
			subject_id: String(form.get('subject_id') ?? '').trim(),
			title: String(form.get('title') ?? '').trim(),
			assessment_date: String(form.get('assessment_date') ?? '').trim(),
			weight: parseNumberInput(form.get('weight'))
		});

		if (!validation.ok) {
			return fail(400, { action: 'createAssessment', message: validation.message });
		}

		const classSubject = await getOwnedClassSubject(
			locals,
			ownedClass.id,
			validation.value.subject_id,
			userId
		);
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
			status: 'draft'
		});

		if (error) {
			return fail(400, { action: 'createAssessment', message: error.message });
		}

		return {
			success: true,
			action: 'createAssessment',
			message: 'Avaliacao criada em rascunho com sucesso.'
		};
	}
};
