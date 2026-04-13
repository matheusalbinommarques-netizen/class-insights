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
				isCurrent: false,
				isSelectable: false
			}
		],
		'Conta sem vínculo acadêmico.',
		'Conta sem vínculo',
		'Adicione um código para concluir o acesso.'
	);

	assert.equal(payload.portal.status, 'pending-link');
	assert.equal(payload.portal.message, 'Conta sem vínculo acadêmico.');
	assert.equal(payload.student.displayName, 'Ana');
	assert.equal(payload.student.className, null);

	assert.equal(payload.summary.totalSubjects, 0);
	assert.equal(payload.summary.subjectsWithScore, 0);
	assert.equal(payload.summary.goodSubjects, 0);
	assert.equal(payload.summary.attentionSubjects, 0);
	assert.equal(payload.summary.pendingSubjects, 0);
	assert.equal(payload.summary.generalAverage, null);
	assert.equal(payload.summary.generalPercent, null);

	assert.equal(payload.bestSubject, null);
	assert.equal(payload.prioritySubject, null);
	assert.deepEqual(payload.subjects, []);
	assert.equal(payload.longitudinal, null);

	assert.equal(payload.enrollments.length, 1);
	assert.equal(payload.academicSummary.title, 'Conta sem vínculo');
	assert.equal(payload.academicSummary.description, 'Adicione um código para concluir o acesso.');
});

test('mapStudentPortalEnrollments marks only the selected active enrollment as current', () => {
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
				joined_at: '2026-03-15T00:00:00.000Z',
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
		'enrollment-1'
	);

	assert.equal(mapped.length, 3);

	assert.deepEqual(mapped[0], {
		enrollmentId: 'enrollment-1',
		studentId: 'student-1',
		classId: 'class-1',
		teacherId: 'teacher-1',
		status: 'active',
		joinedAt: '2026-03-14T00:00:00.000Z',
		leftAt: null,
		studentName: 'Ana',
		className: 'Turma A',
		isCurrent: true,
		isSelectable: true
	});

	assert.equal(mapped[1]?.isCurrent, false);
	assert.equal(mapped[1]?.isSelectable, true);

	assert.equal(mapped[2]?.isCurrent, false);
	assert.equal(mapped[2]?.isSelectable, false);
});

test('mapStudentPortalEnrollments keeps all rows non-current when selection is null', () => {
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
				status: 'pending',
				joined_at: null,
				left_at: null,
				student_name: 'Ana',
				class_name: 'Turma B'
			}
		],
		null
	);

	assert.equal(mapped[0]?.isCurrent, false);
	assert.equal(mapped[0]?.isSelectable, true);

	assert.equal(mapped[1]?.isCurrent, false);
	assert.equal(mapped[1]?.isSelectable, false);
});

test('mapStudentPortalEnrollments does not mark archived selection as current', () => {
	const mapped = mapStudentPortalEnrollments(
		[
			{
				enrollment_id: 'enrollment-9',
				student_id: 'student-1',
				class_id: 'class-9',
				teacher_id: 'teacher-9',
				status: 'archived',
				joined_at: '2026-01-10T00:00:00.000Z',
				left_at: '2026-02-10T00:00:00.000Z',
				student_name: 'Ana',
				class_name: 'Turma Antiga'
			}
		],
		'enrollment-9'
	);

	assert.equal(mapped.length, 1);
	assert.equal(mapped[0]?.isCurrent, false);
	assert.equal(mapped[0]?.isSelectable, false);
});
