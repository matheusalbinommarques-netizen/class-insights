import test from 'node:test';
import assert from 'node:assert/strict';

import { loadCoordDashboard } from './coord.ts';

type Row = Record<string, unknown>;
type Dataset = Record<string, Row[]>;
type RpcResponse = {
	data: unknown;
	error: unknown;
};

function applyFilters(
	rows: Row[],
	filters: Array<
		| { kind: 'eq'; column: string; value: unknown }
		| { kind: 'in'; column: string; values: unknown[] }
	>
) {
	return rows.filter((row) =>
		filters.every((filter) => {
			if (filter.kind === 'eq') {
				return row[filter.column] === filter.value;
			}

			return filter.values.includes(row[filter.column]);
		})
	);
}

function sortRows(rows: Row[], orderBy: { column: string; ascending: boolean } | null) {
	if (!orderBy) return rows;

	return [...rows].sort((left, right) => {
		const leftValue = left[orderBy.column];
		const rightValue = right[orderBy.column];

		if (leftValue === rightValue) return 0;

		const result = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'pt-BR');

		return orderBy.ascending ? result : -result;
	});
}

function createMockLocals(input: { tables?: Dataset; rpcs?: Record<string, RpcResponse> }) {
	const tables = input.tables ?? {};
	const rpcs = input.rpcs ?? {};

	return {
		supabase: {
			async rpc(name: string) {
				return rpcs[name] ?? { data: null, error: null };
			},
			from(table: string) {
				const filters: Array<
					| { kind: 'eq'; column: string; value: unknown }
					| { kind: 'in'; column: string; values: unknown[] }
				> = [];
				let orderBy: { column: string; ascending: boolean } | null = null;

				const run = async () => {
					const rows = tables[table] ?? [];
					const filtered = applyFilters(rows, filters);
					const ordered = sortRows(filtered, orderBy);

					return {
						data: ordered,
						error: null
					};
				};

				const query = {
					select() {
						return query;
					},
					eq(column: string, value: unknown) {
						filters.push({ kind: 'eq', column, value });
						return query;
					},
					in(column: string, values: unknown[]) {
						filters.push({ kind: 'in', column, values });
						return query;
					},
					order(column: string, options?: { ascending?: boolean }) {
						orderBy = {
							column,
							ascending: options?.ascending ?? true
						};

						return run();
					},
					then(resolve: (value: { data: Row[]; error: null }) => unknown) {
						return run().then(resolve);
					}
				};

				return query;
			}
		}
	} as unknown as App.Locals;
}

test('loadCoordDashboard returns error state when scoped classes cannot be loaded', async () => {
	const locals = createMockLocals({
		rpcs: {
			coord_scope_classes: {
				data: null,
				error: { message: 'rpc_failed' }
			}
		}
	});

	const result = await loadCoordDashboard(locals, 'coord-1', 'Coord E2E');

	assert.equal(result.ok, false);

	if (!result.ok) {
		assert.equal(typeof result.error, 'string');
		assert.match(result.error, /coordena|escopo|painel/i);
	}
});

test('loadCoordDashboard ranks institutional priorities across classes, subjects, teachers and students', async () => {
	const locals = createMockLocals({
		rpcs: {
			coord_scope_classes: {
				data: [
					{
						class_id: 'class-a',
						class_name: 'Turma A',
						teacher_id: 'teacher-1',
						teacher_name: 'Prof. Ana',
						access_code: 'AAA111'
					},
					{
						class_id: 'class-b',
						class_name: 'Turma B',
						teacher_id: 'teacher-2',
						teacher_name: 'Prof. Bia',
						access_code: 'BBB222'
					}
				],
				error: null
			}
		},
		tables: {
			students: [
				{
					id: 'student-a1',
					name: 'Alice',
					class_id: 'class-a',
					classes: { name: 'Turma A' },
					student_id: 'student-a1',
					student_name: 'Alice',
					class_name: 'Turma A'
				},
				{
					id: 'student-a2',
					name: 'Aline',
					class_id: 'class-a',
					classes: { name: 'Turma A' },
					student_id: 'student-a2',
					student_name: 'Aline',
					class_name: 'Turma A'
				},
				{
					id: 'student-b1',
					name: 'Bruno',
					class_id: 'class-b',
					classes: { name: 'Turma B' },
					student_id: 'student-b1',
					student_name: 'Bruno',
					class_name: 'Turma B'
				},
				{
					id: 'student-b2',
					name: 'Bianca',
					class_id: 'class-b',
					classes: { name: 'Turma B' },
					student_id: 'student-b2',
					student_name: 'Bianca',
					class_name: 'Turma B'
				}
			],
			class_subjects: [
				{
					class_id: 'class-a',
					subject_id: 'subject-math',
					subjects: { name: 'Matemática' }
				},
				{
					class_id: 'class-a',
					subject_id: 'subject-reading',
					subjects: { name: 'Leitura' }
				},
				{
					class_id: 'class-b',
					subject_id: 'subject-math',
					subjects: { name: 'Matemática' }
				},
				{
					class_id: 'class-b',
					subject_id: 'subject-reading',
					subjects: { name: 'Leitura' }
				}
			],
			assessments: [
				{
					id: 'a-math-1',
					class_id: 'class-a',
					subject_id: 'subject-math',
					status: 'published',
					assessment_date: '2026-03-01'
				},
				{
					id: 'a-math-2',
					class_id: 'class-a',
					subject_id: 'subject-math',
					status: 'published',
					assessment_date: '2026-03-15'
				},
				{
					id: 'a-reading-1',
					class_id: 'class-a',
					subject_id: 'subject-reading',
					status: 'published',
					assessment_date: '2026-03-20'
				},
				{
					id: 'b-math-1',
					class_id: 'class-b',
					subject_id: 'subject-math',
					status: 'published',
					assessment_date: '2026-03-01'
				},
				{
					id: 'b-reading-1',
					class_id: 'class-b',
					subject_id: 'subject-reading',
					status: 'published',
					assessment_date: '2026-03-20'
				}
			],
			assessment_results: [
				{
					assessment_id: 'a-math-1',
					student_id: 'student-a1',
					raw_score: 4,
					score_min: 0,
					score_max: 10,
					is_excused: false
				},
				{
					assessment_id: 'a-math-1',
					student_id: 'student-a2',
					raw_score: 5,
					score_min: 0,
					score_max: 10,
					is_excused: false
				},

				{
					assessment_id: 'a-math-2',
					student_id: 'student-a1',
					raw_score: 3,
					score_min: 0,
					score_max: 10,
					is_excused: false
				},
				{
					assessment_id: 'a-math-2',
					student_id: 'student-a2',
					raw_score: 4,
					score_min: 0,
					score_max: 10,
					is_excused: false
				},

				{
					assessment_id: 'a-reading-1',
					student_id: 'student-a1',
					raw_score: 5,
					score_min: 0,
					score_max: 10,
					is_excused: false
				},
				{
					assessment_id: 'a-reading-1',
					student_id: 'student-a2',
					raw_score: 6,
					score_min: 0,
					score_max: 10,
					is_excused: false
				},

				{
					assessment_id: 'b-math-1',
					student_id: 'student-b1',
					raw_score: 9,
					score_min: 0,
					score_max: 10,
					is_excused: false
				},
				{
					assessment_id: 'b-math-1',
					student_id: 'student-b2',
					raw_score: 8,
					score_min: 0,
					score_max: 10,
					is_excused: false
				},

				{
					assessment_id: 'b-reading-1',
					student_id: 'student-b1',
					raw_score: 8,
					score_min: 0,
					score_max: 10,
					is_excused: false
				},
				{
					assessment_id: 'b-reading-1',
					student_id: 'student-b2',
					raw_score: 9,
					score_min: 0,
					score_max: 10,
					is_excused: false
				}
			]
		}
	});

	const result = await loadCoordDashboard(locals, 'coord-1', 'Coord E2E');

	assert.equal(result.ok, true);

	if (!result.ok) return;

	const dashboard = result.data;

	assert.equal(dashboard.summary.displayName, 'Coord E2E');
	assert.equal(dashboard.summary.totalClasses, 2);
	assert.equal(dashboard.summary.totalStudents, 4);
	assert.equal(dashboard.summary.totalPublishedAssessments, 5);

	assert.equal(dashboard.classes.length, 2);
	assert.equal(dashboard.subjects.length, 2);
	assert.equal(dashboard.teachers.length, 2);
	assert.equal(dashboard.students.length, 4);

	assert.equal(dashboard.classes[0]?.classId, 'class-a');
	assert.equal(dashboard.classes[0]?.detailHref, '/coord/classes/class-a');
	assert.equal(dashboard.classes[0]?.teacherName, 'Prof. Ana');
	assert.ok(
		(dashboard.classes[0]?.priorityScore ?? 0) >= (dashboard.classes[1]?.priorityScore ?? 0)
	);

	assert.equal(dashboard.subjects[0]?.subjectId, 'subject-math');
	assert.equal(dashboard.subjects[0]?.detailHref, '/coord/subjects/subject-math');
	assert.match(dashboard.subjects[0]?.primaryReason ?? '', /queda|media|aten/i);

	assert.equal(dashboard.teachers[0]?.teacherId, 'teacher-1');
	assert.equal(dashboard.teachers[0]?.detailHref, '/coord/teachers/teacher-1');
	assert.ok(
		(dashboard.teachers[0]?.priorityScore ?? 0) >= (dashboard.teachers[1]?.priorityScore ?? 0)
	);

	assert.equal(dashboard.students[0]?.studentId, 'student-a1');
	assert.equal(dashboard.students[0]?.detailHref, '/coord/students/student-a1');
	assert.ok(
		(dashboard.students[0]?.priorityScore ?? 0) >= (dashboard.students[1]?.priorityScore ?? 0)
	);

	assert.ok(dashboard.summary.highlights.length > 0);
	assert.match(dashboard.summary.message, /escopo|institucional|painel|turma/i);
});
