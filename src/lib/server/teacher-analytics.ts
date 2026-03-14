type NormalizableResult = {
	raw_score: number | null;
	score_min: number;
	score_max: number;
};

export type AssessmentConsistencyBand = 'consistent' | 'mixed' | 'spread' | 'pending';
export type AssessmentTone = 'healthy' | 'attention' | 'critical' | 'pending';
export type TeacherRiskLevel = 'high' | 'medium';
export type TeacherClassStatus = 'setup' | 'healthy' | 'attention' | 'critical';

export const TEACHER_ANALYTICS_THRESHOLDS = {
	highRiskPercent: 40,
	attentionPercent: 60,
	significantDelta: 5,
	draftCoverageCritical: 50,
	draftCoverageAttention: 85,
	assessmentCoverageAttention: 80,
	consistencyTightBand: 20,
	consistencyMixedBand: 40,
	criticalRiskStudentsPerAssessment: 3
} as const;

export function clampPercent(value: number): number {
	return Math.max(0, Math.min(100, value));
}

export function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function normalizeResultPercent(result: NormalizableResult) {
	if (typeof result.raw_score !== 'number') return null;

	const range = result.score_max - result.score_min;
	if (range <= 0) return null;

	return clampPercent(((result.raw_score - result.score_min) / range) * 100);
}

export function buildTrendDelta(values: number[]): number | null {
	if (values.length < 2) return null;

	const midpoint = Math.floor(values.length / 2);
	if (midpoint === 0) return null;

	const start = average(values.slice(0, midpoint));
	const end = average(values.slice(midpoint));

	if (start === null || end === null) return null;
	return Number((end - start).toFixed(1));
}

export function buildDispersion(values: number[]): number | null {
	if (values.length < 2) return null;
	return Number((Math.max(...values) - Math.min(...values)).toFixed(1));
}

export function classifyRiskLevel(averagePercent: number): TeacherRiskLevel {
	return averagePercent < TEACHER_ANALYTICS_THRESHOLDS.highRiskPercent ? 'high' : 'medium';
}

export function isBelowAttentionThreshold(value: number) {
	return value < TEACHER_ANALYTICS_THRESHOLDS.attentionPercent;
}

export function isBelowHighRiskThreshold(value: number) {
	return value < TEACHER_ANALYTICS_THRESHOLDS.highRiskPercent;
}

export function isSignificantNegativeDelta(value: number) {
	return value < -TEACHER_ANALYTICS_THRESHOLDS.significantDelta;
}

export function classifyAssessmentConsistency(
	dispersionPercent: number | null
): AssessmentConsistencyBand {
	if (dispersionPercent === null) return 'pending';
	if (dispersionPercent < TEACHER_ANALYTICS_THRESHOLDS.consistencyTightBand) return 'consistent';
	if (dispersionPercent < TEACHER_ANALYTICS_THRESHOLDS.consistencyMixedBand) return 'mixed';
	return 'spread';
}

export function classifyAssessmentTone(input: {
	totalResults: number;
	filledResults: number;
	status: 'draft' | 'published';
	coveragePercent: number;
	averagePercent: number | null;
	riskStudentsCount: number;
	belowTargetCount: number;
	consistencyBand: AssessmentConsistencyBand;
}): AssessmentTone {
	if (input.totalResults === 0 || input.filledResults === 0) {
		return 'pending';
	}

	if (
		input.status === 'published' &&
		((typeof input.averagePercent === 'number' && isBelowHighRiskThreshold(input.averagePercent)) ||
			input.riskStudentsCount >= TEACHER_ANALYTICS_THRESHOLDS.criticalRiskStudentsPerAssessment ||
			input.consistencyBand === 'spread')
	) {
		return 'critical';
	}

	if (
		input.coveragePercent < TEACHER_ANALYTICS_THRESHOLDS.assessmentCoverageAttention ||
		(typeof input.averagePercent === 'number' && isBelowAttentionThreshold(input.averagePercent)) ||
		input.belowTargetCount > 0 ||
		input.consistencyBand === 'mixed'
	) {
		return 'attention';
	}

	return 'healthy';
}

export function classifyTeacherClassStatus(input: {
	studentsCount: number;
	subjectsCount: number;
	assessmentsCount: number;
	publishedAssessmentsCount: number;
	riskStudentsCount: number;
	draftCoveragePercent: number;
	totalExpectedDraftResults: number;
	draftAssessmentsCount: number;
}): TeacherClassStatus {
	if (input.studentsCount === 0 || input.subjectsCount === 0) {
		return 'setup';
	}

	if (input.assessmentsCount === 0) {
		return 'critical';
	}

	if (
		input.riskStudentsCount >= Math.max(2, Math.ceil(input.studentsCount * 0.25)) ||
		(input.totalExpectedDraftResults > 0 &&
			input.draftCoveragePercent < TEACHER_ANALYTICS_THRESHOLDS.draftCoverageCritical) ||
		input.publishedAssessmentsCount === 0
	) {
		return 'critical';
	}

	if (
		input.riskStudentsCount > 0 ||
		(input.totalExpectedDraftResults > 0 &&
			input.draftCoveragePercent < TEACHER_ANALYTICS_THRESHOLDS.draftCoverageAttention) ||
		input.draftAssessmentsCount > 0
	) {
		return 'attention';
	}

	return 'healthy';
}
