export type TeacherDashboardRiskTone = 'critical' | 'attention' | 'neutral';
export type TeacherDashboardTrendTone = 'positive' | 'negative' | 'neutral';

export type TeacherDashboardAnalyticsBucket = {
	label: string;
	value: number;
	heightPercent: number;
};

export type TeacherDashboardAnalyticsSummary = {
	rangeLabel: string;
	buckets: TeacherDashboardAnalyticsBucket[];
};

export type TeacherDashboardActionNow = {
	draftClasses: number;
	belowReferenceSubjects: number;
	fallingStudents: number;
	classesWithoutSubject: number;
	nextStepTitle: string;
	nextStepText: string;
	nextStepHref: string;
};

export type TeacherDashboardBelowReferenceSubject = {
	subjectName: string;
	scoreLabel: string;
	helperText: string;
	href: string;
};

export type TeacherDashboardFallingStudent = {
	studentName: string;
	publishedAverageLabel: string;
	riskLabel: string;
	riskTone: TeacherDashboardRiskTone;
	helperText: string;
	href: string;
};

export type TeacherDashboardRelevantGap = {
	studentName: string;
	gapLabel: string;
	riskLabel: string;
	riskTone: TeacherDashboardRiskTone;
	helperText: string;
	subjects: string[];
	href: string;
};

export type TeacherDashboardPerformanceChanges = {
	belowReferenceSubjects: TeacherDashboardBelowReferenceSubject[];
	belowReferenceSubjectsHref: string;
	fallingStudents: TeacherDashboardFallingStudent[];
	fallingStudentsHref: string;
	relevantGaps: TeacherDashboardRelevantGap[];
	relevantGapsHref: string;
};

export type TeacherDashboardClassSummaryItem = {
	classId: string;
	className: string;
	publishedAverageLabel: string;
	coverageLabel: string;
	trendLabel: string;
	trendTone: TeacherDashboardTrendTone;
	tags: string[];
	statusTone: TeacherDashboardRiskTone;
	openHref: string;
	analyticsSummary: TeacherDashboardAnalyticsSummary;
};

export type TeacherDashboardPageData = {
	teacherName: string;
	syncLabel: string;
	actionNow: TeacherDashboardActionNow;
	performanceChanges: TeacherDashboardPerformanceChanges;
	classesSummary: TeacherDashboardClassSummaryItem[];
	analyticsSummary: TeacherDashboardAnalyticsSummary;
	error: string | null;
};

/**
 * Tipos usados na rota /teacher/[classId]
 */

export type TeacherSubjectAssessment = {
	id: string;
	title: string;
	name: string;
	status: 'draft' | 'published';
	assessment_date: string | null;
	published_at: string | null;
	raw_score?: number | null;
	score_min?: number | null;
	score_max?: number | null;
	is_excused?: boolean;
	[key: string]: unknown;
};

export type TeacherSubjectOption = {
	id: string;
	name: string;
	code: string | null;
};

export type TeacherClassStudent = {
	id: string;
	name: string;
	email: string | null;
	displayName: string | null;
	invite_code: string | null;
	publishedAverageLabel?: string;
	averageLabel?: string;
	latestScoreLabel?: string;
	trendLabel?: string;
	trendTone?: TeacherDashboardTrendTone;
	riskLabel?: string;
	riskTone?: TeacherDashboardRiskTone;
	helperText?: string;
	openHref?: string;
	studentHref?: string;
	subjects?: string[];
};

export type TeacherClassSubjectCard = {
	id: string;
	name: string;
	code: string | null;
	assessments: TeacherSubjectAssessment[];
	subjectId?: string;
	subjectName?: string;
	scoreLabel?: string;
	averageLabel?: string;
	publishedAverageLabel?: string;
	trendLabel?: string;
	trendTone?: TeacherDashboardTrendTone;
	helperText?: string;
	assessmentsCount?: number;
	openHref?: string;
};

export type TeacherClassPageData = {
	classId: string;
	className: string;
	students: TeacherClassStudent[];
	subjectCards: TeacherClassSubjectCard[];
	subjectOptions: TeacherSubjectOption[];
	error: string | null;
	[key: string]: unknown;
};
