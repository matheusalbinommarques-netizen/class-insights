import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

import { getAuthenticatedUserId } from '$lib/server/auth';
import { isMissingRelationError } from '$lib/server/assessments';
import { getOwnedClass } from '$lib/server/teacher';
import type {
	TeacherClassOption,
	TeacherSchemaState,
	TeacherSubjectCard
} from '$lib/types/teacher';
import {
	buildSubjectsSchemaMessage,
	validateClassSubjectLinkInput,
	validateSubjectInput
} from '$lib/server/subjects';

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

function buildSchemaState(
	error: { code?: string; message?: string; details?: string } | null
): TeacherSchemaState {
	return {
		ready: false,
		message: buildSubjectsSchemaMessage(error)
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
			subjects: [] as TeacherSubjectCard[],
			summary: {
				totalSubjects: 0,
				totalLinks: 0
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
			subjects: [] as TeacherSubjectCard[],
			summary: {
				totalSubjects: 0,
				totalLinks: 0
			}
		};
	}

	const classes = (classesData ?? []) as TeacherClassOption[];
	const classIds = classes.map((item) => item.id);

	const { data: subjectsData, error: subjectsError } = await locals.supabase
		.from('subjects')
		.select('id, name, code')
		.order('name', { ascending: true });

	if (subjectsError) {
		return {
			schema: buildSchemaState(subjectsError),
			classes,
			subjects: [] as TeacherSubjectCard[],
			summary: {
				totalSubjects: 0,
				totalLinks: 0
			}
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
				schema: buildSchemaState(classSubjectsError),
				classes,
				subjects: [] as TeacherSubjectCard[],
				summary: {
					totalSubjects: 0,
					totalLinks: 0
				}
			};
		}

		classSubjects = (classSubjectsData ?? []) as ClassSubjectRow[];
	}

	const classNameById = new Map(classes.map((item) => [item.id, item.name]));

	const subjects = ((subjectsData ?? []) as SubjectRow[]).map((subject) => {
		const links = classSubjects.filter((item) => item.subject_id === subject.id);

		return {
			id: subject.id,
			name: subject.name,
			code: subject.code,
			classIds: links.map((item) => item.class_id),
			classNames: links
				.map((item) => classNameById.get(item.class_id))
				.filter((value): value is string => typeof value === 'string')
		};
	});

	return {
		schema: {
			ready: true,
			message: null
		} as TeacherSchemaState,
		classes,
		subjects,
		summary: {
			totalSubjects: subjects.length,
			totalLinks: classSubjects.length
		}
	};
};

export const actions: Actions = {
	createSubject: async ({ request, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createSubject', message: 'Voce precisa estar logado.' });
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
			if (isMissingRelationError(error)) {
				return fail(400, {
					action: 'createSubject',
					message:
						'O schema academico da V1 ainda nao esta disponivel neste ambiente para criar materias.'
				});
			}

			return fail(400, { action: 'createSubject', message: error.message });
		}

		return {
			success: true,
			action: 'createSubject',
			message: 'Materia criada com sucesso.'
		};
	},

	linkSubjectToClass: async ({ request, locals }) => {
		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'linkSubjectToClass', message: 'Voce precisa estar logado.' });
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

		const ownedClass = await getOwnedClass(locals, classId, userId);
		if (!ownedClass) {
			return fail(404, { action: 'linkSubjectToClass', message: 'Turma nao encontrada.' });
		}

		const { data: subject, error: subjectError } = await locals.supabase
			.from('subjects')
			.select('id')
			.eq('id', subjectId)
			.maybeSingle<{ id: string }>();

		if (subjectError) {
			if (isMissingRelationError(subjectError)) {
				return fail(400, {
					action: 'linkSubjectToClass',
					message:
						'O schema academico da V1 ainda nao esta disponivel neste ambiente para vincular materias.'
				});
			}

			return fail(400, { action: 'linkSubjectToClass', message: subjectError.message });
		}

		if (!subject) {
			return fail(404, { action: 'linkSubjectToClass', message: 'Materia nao encontrada.' });
		}

		const { error } = await locals.supabase.from('class_subjects').upsert(
			{
				class_id: classId,
				subject_id: subjectId,
				teacher_id: userId
			},
			{
				onConflict: 'class_id,subject_id'
			}
		);

		if (error) {
			if (isMissingRelationError(error)) {
				return fail(400, {
					action: 'linkSubjectToClass',
					message:
						'O schema academico da V1 ainda nao esta disponivel neste ambiente para vincular materias.'
				});
			}

			return fail(400, { action: 'linkSubjectToClass', message: error.message });
		}

		return {
			success: true,
			action: 'linkSubjectToClass',
			message: 'Materia vinculada a turma com sucesso.'
		};
	}
};
