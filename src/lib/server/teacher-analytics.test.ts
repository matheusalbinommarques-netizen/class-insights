import test from 'node:test';
import assert from 'node:assert/strict';

import {
	TEACHER_ANALYTICS_THRESHOLDS,
	average,
	buildDispersion,
	buildTrendDelta,
	classifyAssessmentConsistency,
	classifyAssessmentTone,
	classifyRiskLevel,
	classifyTeacherClassStatus,
	clampPercent,
	isBelowAttentionThreshold,
	isBelowHighRiskThreshold,
	isSignificantNegativeDelta,
	normalizeResultPercent
} from './teacher-analytics.ts';

test('clampPercent keeps values inside 0..100', () => {
	assert.equal(clampPercent(-20), 0);
	assert.equal(clampPercent(0), 0);
	assert.equal(clampPercent(42.5), 42.5);
	assert.equal(clampPercent(100), 100);
	assert.equal(clampPercent(140), 100);
});

test('average returns null for empty input and arithmetic mean otherwise', () => {
	assert.equal(average([]), null);
	assert.equal(average([50]), 50);
	assert.equal(average([40, 60, 80]), 60);
});

test('normalizeResultPercent respects variable scales and invalid ranges', () => {
	assert.equal(
		normalizeResultPercent({
			raw_score: 7,
			score_min: 0,
			score_max: 10
		}),
		70
	);

	assert.equal(
		normalizeResultPercent({
			raw_score: 16,
			score_min: 10,
			score_max: 20
		}),
		60
	);

	assert.equal(
		normalizeResultPercent({
			raw_score: null,
			score_min: 0,
			score_max: 10
		}),
		null
	);

	assert.equal(
		normalizeResultPercent({
			raw_score: 8,
			score_min: 10,
			score_max: 10
		}),
		null
	);

	assert.equal(
		normalizeResultPercent({
			raw_score: 25,
			score_min: 0,
			score_max: 20
		}),
		100
	);
});

test('buildTrendDelta detects improvement, decline and insufficient series', () => {
	assert.equal(buildTrendDelta([]), null);
	assert.equal(buildTrendDelta([70]), null);
	assert.equal(buildTrendDelta([40, 50, 70, 80]), 30);
	assert.equal(buildTrendDelta([90, 80, 60, 50]), -30);
	assert.equal(buildTrendDelta([60, 61, 60, 61]), 0);
});

test('buildDispersion measures score spread', () => {
	assert.equal(buildDispersion([]), null);
	assert.equal(buildDispersion([70]), null);
	assert.equal(buildDispersion([50, 70, 80]), 30);
	assert.equal(buildDispersion([62.2, 62.8]), 0.6);
});

test('risk threshold helpers follow configured constants', () => {
	assert.equal(TEACHER_ANALYTICS_THRESHOLDS.attentionPercent, 60);
	assert.equal(TEACHER_ANALYTICS_THRESHOLDS.highRiskPercent, 40);
	assert.equal(TEACHER_ANALYTICS_THRESHOLDS.significantDelta, 5);

	assert.equal(classifyRiskLevel(39.9), 'high');
	assert.equal(classifyRiskLevel(40), 'medium');

	assert.equal(isBelowAttentionThreshold(59.9), true);
	assert.equal(isBelowAttentionThreshold(60), false);

	assert.equal(isBelowHighRiskThreshold(39.9), true);
	assert.equal(isBelowHighRiskThreshold(40), false);

	assert.equal(isSignificantNegativeDelta(-5), false);
	assert.equal(isSignificantNegativeDelta(-5.1), true);
	assert.equal(isSignificantNegativeDelta(-10), true);
});

test('classifyAssessmentConsistency maps pending, consistent, mixed and spread', () => {
	assert.equal(classifyAssessmentConsistency(null), 'pending');
	assert.equal(
		classifyAssessmentConsistency(TEACHER_ANALYTICS_THRESHOLDS.consistencyTightBand - 0.1),
		'consistent'
	);
	assert.equal(
		classifyAssessmentConsistency(TEACHER_ANALYTICS_THRESHOLDS.consistencyTightBand),
		'mixed'
	);
	assert.equal(
		classifyAssessmentConsistency(TEACHER_ANALYTICS_THRESHOLDS.consistencyMixedBand - 0.1),
		'mixed'
	);
	assert.equal(
		classifyAssessmentConsistency(TEACHER_ANALYTICS_THRESHOLDS.consistencyMixedBand),
		'spread'
	);
});

test('classifyAssessmentTone marks pending when there is no filled result', () => {
	assert.equal(
		classifyAssessmentTone({
			totalResults: 30,
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
});

test('classifyAssessmentTone marks critical for published severe scenarios', () => {
	assert.equal(
		classifyAssessmentTone({
			totalResults: 30,
			filledResults: 30,
			status: 'published',
			coveragePercent: 100,
			averagePercent: 35,
			riskStudentsCount: 0,
			belowTargetCount: 0,
			consistencyBand: 'consistent'
		}),
		'critical'
	);

	assert.equal(
		classifyAssessmentTone({
			totalResults: 30,
			filledResults: 30,
			status: 'published',
			coveragePercent: 100,
			averagePercent: 72,
			riskStudentsCount: TEACHER_ANALYTICS_THRESHOLDS.criticalRiskStudentsPerAssessment,
			belowTargetCount: 0,
			consistencyBand: 'consistent'
		}),
		'critical'
	);

	assert.equal(
		classifyAssessmentTone({
			totalResults: 30,
			filledResults: 30,
			status: 'published',
			coveragePercent: 100,
			averagePercent: 75,
			riskStudentsCount: 0,
			belowTargetCount: 0,
			consistencyBand: 'spread'
		}),
		'critical'
	);
});

test('classifyAssessmentTone marks attention before healthy', () => {
	assert.equal(
		classifyAssessmentTone({
			totalResults: 30,
			filledResults: 18,
			status: 'draft',
			coveragePercent: 60,
			averagePercent: 75,
			riskStudentsCount: 0,
			belowTargetCount: 0,
			consistencyBand: 'consistent'
		}),
		'attention'
	);

	assert.equal(
		classifyAssessmentTone({
			totalResults: 30,
			filledResults: 30,
			status: 'published',
			coveragePercent: 100,
			averagePercent: 58,
			riskStudentsCount: 0,
			belowTargetCount: 0,
			consistencyBand: 'consistent'
		}),
		'attention'
	);

	assert.equal(
		classifyAssessmentTone({
			totalResults: 30,
			filledResults: 30,
			status: 'published',
			coveragePercent: 100,
			averagePercent: 82,
			riskStudentsCount: 0,
			belowTargetCount: 1,
			consistencyBand: 'consistent'
		}),
		'attention'
	);

	assert.equal(
		classifyAssessmentTone({
			totalResults: 30,
			filledResults: 30,
			status: 'published',
			coveragePercent: 100,
			averagePercent: 82,
			riskStudentsCount: 0,
			belowTargetCount: 0,
			consistencyBand: 'mixed'
		}),
		'attention'
	);
});

test('classifyAssessmentTone marks healthy only when the scenario is solid', () => {
	assert.equal(
		classifyAssessmentTone({
			totalResults: 30,
			filledResults: 30,
			status: 'published',
			coveragePercent: 100,
			averagePercent: 84,
			riskStudentsCount: 0,
			belowTargetCount: 0,
			consistencyBand: 'consistent'
		}),
		'healthy'
	);
});

test('classifyTeacherClassStatus marks setup when turma is structurally incomplete', () => {
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
			subjectsCount: 0,
			assessmentsCount: 0,
			publishedAssessmentsCount: 0,
			riskStudentsCount: 0,
			draftCoveragePercent: 0,
			totalExpectedDraftResults: 0,
			draftAssessmentsCount: 0
		}),
		'setup'
	);
});

test('classifyTeacherClassStatus marks critical when there is no assessment flow yet', () => {
	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 20,
			subjectsCount: 3,
			assessmentsCount: 0,
			publishedAssessmentsCount: 0,
			riskStudentsCount: 0,
			draftCoveragePercent: 0,
			totalExpectedDraftResults: 0,
			draftAssessmentsCount: 0
		}),
		'critical'
	);
});

test('classifyTeacherClassStatus marks critical for teacher priority scenarios', () => {
	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 20,
			subjectsCount: 3,
			assessmentsCount: 4,
			publishedAssessmentsCount: 2,
			riskStudentsCount: 5,
			draftCoveragePercent: 100,
			totalExpectedDraftResults: 20,
			draftAssessmentsCount: 0
		}),
		'critical'
	);

	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 20,
			subjectsCount: 3,
			assessmentsCount: 4,
			publishedAssessmentsCount: 2,
			riskStudentsCount: 0,
			draftCoveragePercent: TEACHER_ANALYTICS_THRESHOLDS.draftCoverageCritical - 1,
			totalExpectedDraftResults: 20,
			draftAssessmentsCount: 1
		}),
		'critical'
	);

	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 20,
			subjectsCount: 3,
			assessmentsCount: 4,
			publishedAssessmentsCount: 0,
			riskStudentsCount: 0,
			draftCoveragePercent: 100,
			totalExpectedDraftResults: 20,
			draftAssessmentsCount: 1
		}),
		'critical'
	);
});

test('classifyTeacherClassStatus marks attention before healthy', () => {
	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 20,
			subjectsCount: 3,
			assessmentsCount: 4,
			publishedAssessmentsCount: 2,
			riskStudentsCount: 1,
			draftCoveragePercent: 100,
			totalExpectedDraftResults: 20,
			draftAssessmentsCount: 0
		}),
		'attention'
	);

	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 20,
			subjectsCount: 3,
			assessmentsCount: 4,
			publishedAssessmentsCount: 2,
			riskStudentsCount: 0,
			draftCoveragePercent: TEACHER_ANALYTICS_THRESHOLDS.draftCoverageAttention - 1,
			totalExpectedDraftResults: 20,
			draftAssessmentsCount: 1
		}),
		'attention'
	);

	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 20,
			subjectsCount: 3,
			assessmentsCount: 4,
			publishedAssessmentsCount: 2,
			riskStudentsCount: 0,
			draftCoveragePercent: 100,
			totalExpectedDraftResults: 20,
			draftAssessmentsCount: 1
		}),
		'attention'
	);
});

test('classifyTeacherClassStatus marks healthy only when class flow is stable', () => {
	assert.equal(
		classifyTeacherClassStatus({
			studentsCount: 20,
			subjectsCount: 3,
			assessmentsCount: 4,
			publishedAssessmentsCount: 2,
			riskStudentsCount: 0,
			draftCoveragePercent: 100,
			totalExpectedDraftResults: 20,
			draftAssessmentsCount: 0
		}),
		'healthy'
	);
});
