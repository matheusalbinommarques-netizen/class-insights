import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildPendingStudentPortalPayload,
	mapStudentPortalEnrollments,
	type StudentPortalParentData
} from './student-portal.helpers.ts';

const parentData: StudentPortalParentData = {
	authUser: {
		id: 'user-1',
		email: 'aluno@example.com'
	},
	profile: {
		id: 'user-1',
		role: 'student',
		display_name: 'Ana'
	}
};

test('buildPendingStudentPortalPayload preserves profile identity and pending state', () => {
	const payload = buildPendingStudentPortalPayload(
		parentData,
		[
			{
				enrollmentId: 'enrollment-1',
				studentId: 'student-1',
				classId: 'class-1',
				teacherId: 'teacher-1',
				status: 'pending',
				joinedAt: null,
				leftAt: null,
				studentName: 'Ana',
				className: 'Turma A',
				isCurrent: false
			}
		],
		'Conta sem vinculo academico.',
		'Conta sem vinculo',
		'Adicione um codigo para concluir o acesso.'
	);

	assert.equal(payload.portal.status, 'pending-link');
	assert.equal(payload.student.displayName, 'Ana');
	assert.equal(payload.student.className, null);
	assert.equal(payload.summary.totalSubjects, 0);
	assert.equal(payload.enrollments.length, 1);
	assert.equal(payload.academicSummary.title, 'Conta sem vinculo');
});

test('mapStudentPortalEnrollments marks only the active matching class as current', () => {
	const mapped = mapStudentPortalEnrollments(
		[
			{
				enrollment_id: 'enrollment-1',
				student_id: 'student-1',
				class_id: 'class-1',
				teacher_id: 'teacher-1',
				status: 'active',
				joined_at: '2026-03-14T00:00:00.000Z',
				left_at: null,
				student_name: 'Ana',
				class_name: 'Turma A'
			},
			{
				enrollment_id: 'enrollment-2',
				student_id: 'student-1',
				class_id: 'class-2',
				teacher_id: 'teacher-2',
				status: 'active',
				joined_at: '2026-03-14T00:00:00.000Z',
				left_at: null,
				student_name: 'Ana',
				class_name: 'Turma B'
			},
			{
				enrollment_id: 'enrollment-3',
				student_id: 'student-1',
				class_id: 'class-1',
				teacher_id: 'teacher-1',
				status: 'archived',
				joined_at: '2026-02-01T00:00:00.000Z',
				left_at: '2026-02-28T00:00:00.000Z',
				student_name: 'Ana',
				class_name: 'Turma A'
			}
		],
		'class-1'
	);

	assert.equal(mapped.length, 3);
	assert.equal(mapped[0]?.isCurrent, true);
	assert.equal(mapped[1]?.isCurrent, false);
	assert.equal(mapped[2]?.isCurrent, false);
});
