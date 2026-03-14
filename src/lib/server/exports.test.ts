import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPublishedAssessmentExport, buildStudentLongitudinalExport } from './exports.ts';

test('buildPublishedAssessmentExport serializes published results in csv format', () => {
	const csv = buildPublishedAssessmentExport({
		assessment: {
			id: 'assessment-1',
			class_id: 'class-1',
			subject_id: 'subject-1',
			title: 'Prova 1',
			assessment_date: '2026-03-10',
			weight: 1,
			status: 'published',
			published_at: '2026-03-11T12:00:00.000Z',
			published_by: 'teacher-1',
			class_name: 'Turma A',
			class_score_min: 0,
			class_score_max: 10,
			class_score_decimals: 1,
			subject_name: 'Matematica',
			subject_code: 'MAT'
		},
		students: [
			{ id: 'student-1', name: 'Ana' },
			{ id: 'student-2', name: 'Bruno' }
		],
		results: [
			{
				student_id: 'student-1',
				raw_score: 8.5,
				score_min: 0,
				score_max: 10,
				score_decimals: 1,
				is_excused: false,
				notes: 'Bom desempenho'
			}
		]
	});

	assert.match(csv, /Turma A,Matematica,Prova 1,2026-03-10,student-1,Ana,8.5,85/);
	assert.match(csv, /student-2,Bruno,,,false,/);
});

test('buildStudentLongitudinalExport serializes subject summary rows', () => {
	const csv = buildStudentLongitudinalExport({
		profile: {
			student: {
				id: 'student-1',
				enrollmentId: 'enrollment-1',
				displayName: 'Ana',
				classId: 'class-1',
				className: 'Turma A'
			},
			classroom: {
				id: 'class-1',
				name: 'Turma A',
				score_min: 0,
				score_max: 10,
				score_decimals: 1
			},
			summary: {
				publishedAssessments: 3,
				totalSubjects: 1,
				subjectsWithScore: 1,
				goodSubjects: 1,
				attentionSubjects: 0,
				pendingSubjects: 0,
				generalAverage: 8.5,
				generalPercent: 85,
				classAveragePercent: 74,
				gapPercent: 11
			},
			bestSubject: null,
			prioritySubject: null,
			academicSummary: {
				title: 'Resumo',
				description: 'Descricao'
			},
			longitudinal: null,
			subjects: [
				{
					id: 'subject-1',
					name: 'Matematica',
					code: 'MAT',
					score: 8.5,
					progress: 85,
					status: 'good',
					description: 'Bom momento',
					assessmentsCount: 3,
					latestAssessmentTitle: 'Prova 1',
					latestAssessmentDate: '2026-03-10',
					classAverage: 74,
					gapPercent: 11,
					recentTrend: 'improving'
				}
			],
			timeline: []
		}
	});

	assert.match(
		csv,
		/student-1,Ana,Turma A,subject-1,Matematica,8.5,85,74,11,improving,Prova 1,2026-03-10,3/
	);
});
