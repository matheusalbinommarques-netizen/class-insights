import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildAssessmentRevisionTitle,
	buildPublicationMetadata,
	getVisibleResultsForStudent,
	isPublished
} from './publication.ts';

test('isPublished only accepts the published status', () => {
	assert.equal(isPublished('published'), true);
	assert.equal(isPublished('draft'), false);
});

test('getVisibleResultsForStudent ignores draft and unknown assessments', () => {
	const results = [
		{
			id: 'r1',
			assessment_id: 'a1',
			student_id: 's1',
			raw_score: 7,
			score_min: 0,
			score_max: 10,
			score_decimals: 1,
			is_excused: false,
			notes: null,
			created_at: '2026-03-14T00:00:00.000Z'
		},
		{
			id: 'r2',
			assessment_id: 'a2',
			student_id: 's1',
			raw_score: 8,
			score_min: 0,
			score_max: 10,
			score_decimals: 1,
			is_excused: false,
			notes: null,
			created_at: '2026-03-14T00:00:00.000Z'
		},
		{
			id: 'r3',
			assessment_id: 'a3',
			student_id: 's1',
			raw_score: 9,
			score_min: 0,
			score_max: 10,
			score_decimals: 1,
			is_excused: false,
			notes: null,
			created_at: '2026-03-14T00:00:00.000Z'
		}
	];

	const assessmentsById = new Map([
		['a1', { id: 'a1', status: 'published' as const }],
		['a2', { id: 'a2', status: 'draft' as const }]
	]);

	assert.deepEqual(
		getVisibleResultsForStudent(results, assessmentsById).map((result) => result.id),
		['r1']
	);
});

test('buildPublicationMetadata preserves actor id and accepts deterministic timestamps', () => {
	const at = new Date('2026-03-14T12:00:00.000Z');

	assert.deepEqual(buildPublicationMetadata('teacher-1', at), {
		status: 'published',
		published_at: '2026-03-14T12:00:00.000Z',
		published_by: 'teacher-1'
	});
});

test('buildAssessmentRevisionTitle normalizes spacing and avoids duplicate correction suffix', () => {
	assert.equal(buildAssessmentRevisionTitle('Prova   bimestral'), 'Prova bimestral - Correcao');
	assert.equal(
		buildAssessmentRevisionTitle('Prova bimestral - Correcao'),
		'Prova bimestral - Correcao'
	);
	assert.equal(buildAssessmentRevisionTitle('  '), 'Correcao');
});
