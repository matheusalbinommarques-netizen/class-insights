import test from 'node:test';
import assert from 'node:assert/strict';

import {
	getOwnedAssessment,
	getOwnedClass,
	getOwnedClassSubject,
	getOwnedStudent
} from './teacher.ts';

type Row = Record<string, unknown>;
type Dataset = Record<string, Row[]>;

function createMockLocals(dataset: Dataset) {
	return {
		supabase: {
			from(table: string) {
				const filters: Array<{ column: string; value: unknown }> = [];

				const query = {
					select() {
						return query;
					},
					eq(column: string, value: unknown) {
						filters.push({ column, value });
						return query;
					},
					async maybeSingle() {
						const rows = dataset[table] ?? [];
						const data =
							rows.find((row) => filters.every((filter) => row[filter.column] === filter.value)) ??
							null;

						return {
							data,
							error: null
						};
					}
				};

				return query;
			}
		}
	} as unknown as App.Locals;
}

test('getOwnedClass returns the class only when it belongs to the teacher', async () => {
	const locals = createMockLocals({
		classes: [
			{
				id: 'class-1',
				name: 'Turma A',
				teacher_id: 'teacher-1',
				score_min: 0,
				score_max: 10,
				score_decimals: 1
			}
		]
	});

	assert.deepEqual(await getOwnedClass(locals, 'class-1', 'teacher-1'), {
		id: 'class-1',
		name: 'Turma A',
		score_min: 0,
		score_max: 10,
		score_decimals: 1,
		access_code: null
	});

	assert.equal(await getOwnedClass(locals, 'class-1', 'teacher-2'), null);
});

test('getOwnedStudent and getOwnedClassSubject respect class and teacher scoping', async () => {
	const locals = createMockLocals({
		students: [
			{ id: 'student-1', class_id: 'class-1' },
			{ id: 'student-2', class_id: 'class-2' }
		],
		class_subjects: [{ class_id: 'class-1', subject_id: 'subject-1', teacher_id: 'teacher-1' }]
	});

	assert.deepEqual(await getOwnedStudent(locals, 'class-1', 'student-1'), { id: 'student-1' });
	assert.equal(await getOwnedStudent(locals, 'class-1', 'student-2'), null);

	assert.deepEqual(await getOwnedClassSubject(locals, 'class-1', 'subject-1', 'teacher-1'), {
		class_id: 'class-1',
		subject_id: 'subject-1',
		teacher_id: 'teacher-1'
	});
	assert.equal(await getOwnedClassSubject(locals, 'class-1', 'subject-1', 'teacher-2'), null);
});

test('getOwnedAssessment returns enriched assessment data only inside teacher scope', async () => {
	const locals = createMockLocals({
		assessments: [
			{
				id: 'assessment-1',
				class_id: 'class-1',
				subject_id: 'subject-1',
				title: 'Prova 1',
				assessment_date: '2026-03-14',
				weight: 2,
				status: 'draft',
				published_at: null,
				published_by: null
			}
		],
		classes: [
			{
				id: 'class-1',
				name: 'Turma A',
				teacher_id: 'teacher-1',
				score_min: 0,
				score_max: 10,
				score_decimals: 1
			}
		],
		subjects: [{ id: 'subject-1', name: 'Matematica', code: 'MAT' }]
	});

	assert.deepEqual(await getOwnedAssessment(locals, 'assessment-1', 'teacher-1'), {
		id: 'assessment-1',
		class_id: 'class-1',
		subject_id: 'subject-1',
		title: 'Prova 1',
		assessment_date: '2026-03-14',
		weight: 2,
		status: 'draft',
		published_at: null,
		published_by: null,
		class_name: 'Turma A',
		class_score_min: 0,
		class_score_max: 10,
		class_score_decimals: 1,
		subject_name: 'Matematica',
		subject_code: 'MAT'
	});

	assert.equal(await getOwnedAssessment(locals, 'assessment-1', 'teacher-2'), null);
});

test('getOwnedAssessment returns null when the linked subject is missing', async () => {
	const locals = createMockLocals({
		assessments: [
			{
				id: 'assessment-1',
				class_id: 'class-1',
				subject_id: 'subject-missing',
				title: 'Prova 1',
				assessment_date: '2026-03-14',
				weight: 2,
				status: 'draft',
				published_at: null,
				published_by: null
			}
		],
		classes: [
			{
				id: 'class-1',
				name: 'Turma A',
				teacher_id: 'teacher-1',
				score_min: 0,
				score_max: 10,
				score_decimals: 1
			}
		],
		subjects: []
	});

	assert.equal(await getOwnedAssessment(locals, 'assessment-1', 'teacher-1'), null);
});
