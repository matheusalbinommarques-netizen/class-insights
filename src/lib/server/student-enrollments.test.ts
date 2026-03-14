import assert from 'node:assert/strict';
import test from 'node:test';

import {
	resolveStudentEnrollmentSelection,
	sortStudentEnrollments,
	type StudentEnrollmentRow
} from './student-enrollments.ts';

const rows: StudentEnrollmentRow[] = [
	{
		enrollment_id: 'pending-1',
		student_id: 'student-1',
		class_id: 'class-pending',
		teacher_id: 'teacher-1',
		status: 'pending',
		joined_at: '2026-03-01T10:00:00.000Z',
		left_at: null,
		student_name: 'Ana',
		class_name: 'Turma pendente'
	},
	{
		enrollment_id: 'active-older',
		student_id: 'student-1',
		class_id: 'class-1',
		teacher_id: 'teacher-1',
		status: 'active',
		joined_at: '2026-03-05T10:00:00.000Z',
		left_at: null,
		student_name: 'Ana',
		class_name: 'Turma A'
	},
	{
		enrollment_id: 'active-newer',
		student_id: 'student-1',
		class_id: 'class-2',
		teacher_id: 'teacher-2',
		status: 'active',
		joined_at: '2026-03-08T10:00:00.000Z',
		left_at: null,
		student_name: 'Ana',
		class_name: 'Turma B'
	}
];

test('sortStudentEnrollments prioritizes active and newer rows', () => {
	const ordered = sortStudentEnrollments(rows);

	assert.deepEqual(
		ordered.map((row) => row.enrollment_id),
		['active-newer', 'active-older', 'pending-1']
	);
});

test('resolveStudentEnrollmentSelection honors explicit preferred active enrollment', () => {
	const selection = resolveStudentEnrollmentSelection(rows, 'active-older');

	assert.equal(selection.selectedEnrollmentId, 'active-older');
	assert.equal(selection.currentClassId, 'class-1');
});

test('resolveStudentEnrollmentSelection falls back to newest active enrollment', () => {
	const selection = resolveStudentEnrollmentSelection(rows, 'missing');

	assert.equal(selection.selectedEnrollmentId, 'active-newer');
	assert.equal(selection.currentStudentId, 'student-1');
});
