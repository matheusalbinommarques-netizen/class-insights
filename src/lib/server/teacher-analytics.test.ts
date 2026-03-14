import test from 'node:test';
import assert from 'node:assert/strict';

import {
	average,
	buildDispersion,
	buildTrendDelta,
	classifyAssessmentConsistency,
	classifyAssessmentTone,
	classifyRiskLevel,
	classifyTeacherClassStatus,
	isBelowAttentionThreshold,
	isBelowHighRiskThreshold,
	isSignificantNegativeDelta,
	normalizeResultPercent
} from './teacher-analytics.ts';

test('normalizeResultPercent normalizes scores into a 0-100 range', () => {
	assert.equal(normalizeResultPercent({ raw_score: 7, score_min: 0, score_max: 10 }), 70);
	assert.equal(normalizeResultPercent({ raw_score: -2, score_min: 0, score_max: 10 }), 0);
	assert.equal(normalizeResultPercent({ raw_score: 15, score_min: 0, score_max: 10 }), 100);
	assert.equal(normalizeResultPercent({ raw_score: null, score_min: 0, score_max: 10 }), null);
});

test('average, trend delta and dispersion summarize numeric series', () => {
	assert.equal(average([40, 60, 80]), 60);
	assert.equal(average([]), null);
	assert.equal(buildTrendDelta([40, 50, 70, 80]), 30);
	assert.equal(buildTrendDelta([60]), null);
	assert.equal(buildDispersion([40, 55, 70]), 30);
	assert.equal(buildDispersion([70]), null);
});

test('threshold helpers expose attention and critical boundaries', () => {
	assert.equal(isBelowHighRiskThreshold(39.9), true);
	assert.equal(isBelowHighRiskThreshold(40), false);
	assert.equal(isBelowAttentionThreshold(59.9), true);
	assert.equal(isBelowAttentionThreshold(60), false);
	assert.equal(isSignificantNegativeDelta(-5.1), true);
	assert.equal(isSignificantNegativeDelta(-5), false);
	assert.equal(classifyRiskLevel(35), 'high');
	assert.equal(classifyRiskLevel(55), 'medium');
});

test('assessment consistency and tone follow shared analytics rules', () => {
	assert.equal(classifyAssessmentConsistency(null), 'pending');
	assert.equal(classifyAssessmentConsistency(15), 'consistent');
	assert.equal(classifyAssessmentConsistency(30), 'mixed');
	assert.equal(classifyAssessmentConsistency(45), 'spread');

	assert.equal(
		classifyAssessmentTone({
			totalResults: 0,
			filledResults: 0,
			status: 'draft',
			coveragePercent: 0,
			averagePercent: null,
			riskStudentsCount: 0,
			belowTargetCount: 0,
			consistencyBand: 'pending'
		}),
		'pending'
	);

	assert.equal(
		classifyAssessmentTone({
			totalResults: 10,
			filledResults: 10,
			status: 'published',
			coveragePercent: 100,
			averagePercent: 35,
			riskStudentsCount: 4,
			belowTargetCount: 6,
			consistencyBand: 'spread'
		}),
		'critical'
	);

	assert.equal(
		classifyAssessmentTone({
			totalResults: 10,
			filledResults: 8,
			status: 'draft',
			coveragePercent: 80,
			averagePercent: 58,
			riskStudentsCount: 1,
			belowTargetCount: 3,
			consistencyBand: 'mixed'
		}),
		'attention'
	);

	assert.equal(
		classifyAssessmentTone({
			totalResults: 10,
			filledResults: 10,
			status: 'published',
			coveragePercent: 100,
			averagePercent: 76,
			riskStudentsCount: 0,
			belowTargetCount: 0,
			consistencyBand: 'consistent'
		}),
		'healthy'
	);
});

test('teacher class status reflects setup, critical and healthy states', () => {
	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 0,
			subjectsCount: 1,
			assessmentsCount: 0,
			publishedAssessmentsCount: 0,
			riskStudentsCount: 0,
			draftCoveragePercent: 0,
			totalExpectedDraftResults: 0,
			draftAssessmentsCount: 0
		}),
		'setup'
	);

	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 20,
			subjectsCount: 3,
			assessmentsCount: 2,
			publishedAssessmentsCount: 1,
			riskStudentsCount: 5,
			draftCoveragePercent: 45,
			totalExpectedDraftResults: 20,
			draftAssessmentsCount: 1
		}),
		'critical'
	);

	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 20,
			subjectsCount: 3,
			assessmentsCount: 3,
			publishedAssessmentsCount: 2,
			riskStudentsCount: 1,
			draftCoveragePercent: 70,
			totalExpectedDraftResults: 20,
			draftAssessmentsCount: 1
		}),
		'attention'
	);

	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 20,
			subjectsCount: 3,
			assessmentsCount: 3,
			publishedAssessmentsCount: 3,
			riskStudentsCount: 0,
			draftCoveragePercent: 100,
			totalExpectedDraftResults: 0,
			draftAssessmentsCount: 0
		}),
		'healthy'
	);
});
