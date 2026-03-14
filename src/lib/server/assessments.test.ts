import test from 'node:test';
import assert from 'node:assert/strict';

import {
	canEditAssessment,
	canPublishAssessment,
	validateAssessmentInput,
	validateAssessmentResultDraft
} from './assessments.ts';
import { buildStudentLongitudinalSummary } from './longitudinal.ts';
import {
	buildAssessmentRevisionTitle,
	buildPublicationMetadata,
	getVisibleResultsForStudent
} from './publication.ts';

test('validateAssessmentInput accepts valid draft assessment', () => {
	const result = validateAssessmentInput({
		class_id: 'class-1',
		subject_id: 'subject-1',
		title: '  Prova 1  ',
		assessment_date: '2026-03-10',
		weight: 2
	});

	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.value.title, 'Prova 1');
		assert.equal(result.value.status, 'draft');
	}
});

test('validateAssessmentInput rejects invalid weight', () => {
	const result = validateAssessmentInput({
		class_id: 'class-1',
		subject_id: 'subject-1',
		title: 'Prova 1',
		assessment_date: '2026-03-10',
		weight: 0
	});

	assert.equal(result.ok, false);
});

test('assessment edit/publication guards follow draft and results rules', () => {
	assert.equal(canEditAssessment({ status: 'draft' }), true);
	assert.equal(canEditAssessment({ status: 'published' }), false);

	assert.deepEqual(canPublishAssessment({ status: 'draft' }, { hasResults: true }), {
		ok: true
	});
	assert.equal(canPublishAssessment({ status: 'draft' }, { hasResults: false }).ok, false);
});

test('assessment result draft validation handles blank, notes and valid scores', () => {
	const blank = validateAssessmentResultDraft({
		raw_score: '',
		score_min: 0,
		score_max: 10,
		score_decimals: 1,
		is_excused: false,
		notes: ' '
	});

	assert.equal(blank.ok, true);
	if (blank.ok) {
		assert.equal(blank.value.shouldDelete, true);
		assert.equal(blank.value.raw_score, null);
	}

	const notedBlank = validateAssessmentResultDraft({
		raw_score: '',
		score_min: 0,
		score_max: 10,
		score_decimals: 1,
		is_excused: true,
		notes: ' Falta justificada '
	});

	assert.equal(notedBlank.ok, true);
	if (notedBlank.ok) {
		assert.equal(notedBlank.value.shouldDelete, false);
		assert.equal(notedBlank.value.notes, 'Falta justificada');
	}

	const valid = validateAssessmentResultDraft({
		raw_score: '8,5',
		score_min: 0,
		score_max: 10,
		score_decimals: 1,
		is_excused: false,
		notes: null
	});

	assert.equal(valid.ok, true);
	if (valid.ok) {
		assert.equal(valid.value.raw_score, 8.5);
	}
});

test('publication helpers expose only published results', () => {
	const results = [
		{
			id: 'r1',
			created_at: '2026-03-10T00:00:00.000Z',
			assessment_id: 'a1',
			student_id: 's1',
			raw_score: 8,
			score_min: 0,
			score_max: 10,
			score_decimals: 1,
			is_excused: false,
			notes: null
		},
		{
			id: 'r2',
			created_at: '2026-03-10T00:00:00.000Z',
			assessment_id: 'a2',
			student_id: 's1',
			raw_score: 6,
			score_min: 0,
			score_max: 10,
			score_decimals: 1,
			is_excused: false,
			notes: null
		}
	];

	const assessmentsById = new Map([
		['a1', { id: 'a1', status: 'published' as const }],
		['a2', { id: 'a2', status: 'draft' as const }]
	]);

	assert.equal(getVisibleResultsForStudent(results, assessmentsById).length, 1);
	assert.equal(buildPublicationMetadata('teacher-1').status, 'published');
});

test('revision title helper creates a correction title without duplicating suffixes', () => {
	assert.equal(buildAssessmentRevisionTitle('  Prova 1  '), 'Prova 1 - Correcao');
	assert.equal(buildAssessmentRevisionTitle('Prova 1 - Correcao'), 'Prova 1 - Correcao');
	assert.equal(buildAssessmentRevisionTitle('   '), 'Correcao');
});

test('longitudinal summary derives best/worst subject and recent trend', () => {
	const summary = buildStudentLongitudinalSummary({
		student_id: 's1',
		student_name: 'Ana',
		timeline: [
			{
				assessment_id: 'a1',
				assessment_title: 'P1',
				assessment_date: '2026-03-01',
				subject_id: 'math',
				subject_name: 'Matematica',
				raw_score: 5,
				normalized_percent: 50,
				status: 'published'
			},
			{
				assessment_id: 'a2',
				assessment_title: 'P2',
				assessment_date: '2026-03-10',
				subject_id: 'math',
				subject_name: 'Matematica',
				raw_score: 8,
				normalized_percent: 80,
				status: 'published'
			},
			{
				assessment_id: 'a3',
				assessment_title: 'Redacao 1',
				assessment_date: '2026-03-12',
				subject_id: 'writing',
				subject_name: 'Redacao',
				raw_score: 6,
				normalized_percent: 60,
				status: 'published'
			}
		]
	});

	assert.equal(summary.best_subject, 'Matematica');
	assert.equal(summary.worst_subject, 'Redacao');
	assert.equal(summary.recent_trend, 'improving');
});
