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
	status: 'draft' | 'published';
	assessmentDate: string | null;
	publishedAt: string | null;
	weight: number;
	resultsCount: number;
	rawScore?: number | null;
	scoreMin?: number | null;
	scoreMax?: number | null;
	isExcused?: boolean;
	[key: string]: unknown;
};

export type TeacherSubjectOption = {
	id: string;
	name: string;
	code: string | null;
	classIds: string[];
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

/**
 * Tipos compartilhados do núcleo acadêmico do teacher
 */

export type TeacherSchemaState = {
	ready: boolean;
	message: string | null;
};

export type TeacherClassOption = {
	id: string;
	name: string;
};

export type TeacherSubjectCard = TeacherSubjectOption & {
	classNames: string[];
};

export type TeacherAssessmentStatus = 'draft' | 'published';
export type TeacherAssessmentTone = 'healthy' | 'attention' | 'critical' | 'pending';
export type TeacherAssessmentConsistencyBand = 'consistent' | 'mixed' | 'spread' | 'pending';

export type TeacherAssessmentCard = {
	id: string;
	title: string;
	assessmentDate: string;
	weight: number;
	status: TeacherAssessmentStatus;
	publishedAt: string | null;
	classId: string;
	className: string;
	subjectId: string;
	subjectName: string;
	filledResults: number;
	excusedResults: number;
	totalResults: number;
};

export type TeacherAssessmentAnalyticsCard = {
	id: string;
	title: string;
	assessmentDate: string;
	status: TeacherAssessmentStatus;
	className: string;
	subjectName: string;
	coveragePercent: number;
	averagePercent: number | null;
	riskStudentsCount: number;
	belowTargetCount: number;
	dispersionPercent: number | null;
	consistencyBand: TeacherAssessmentConsistencyBand;
	tone: TeacherAssessmentTone;
};

export type TeacherAssessmentsMetricTone = 'neutral' | 'attention' | 'critical' | 'positive';

export type TeacherAssessmentsSummaryMetric = {
	label: string;
	value: string;
	tone: TeacherAssessmentsMetricTone;
};

export type TeacherAssessmentStatusBadgeTone =
	| 'draft'
	| 'ready'
	| 'published'
	| 'attention'
	| 'critical';

export type TeacherAssessmentActionItem = {
	id: string;
	title: string;
	className: string;
	subjectName: string;
	statusLabel: string;
	statusTone: TeacherAssessmentStatusBadgeTone;
	coverageLabel: string;
	averageLabel: string;
	dateLabel: string;
	nextStepText: string;
	actionHref: string;
	actionLabel: string;
};

export type TeacherAssessmentTableRow = {
	id: string;
	title: string;
	classId: string;
	className: string;
	subjectId: string;
	subjectName: string;
	status: TeacherAssessmentStatus;
	statusLabel: string;
	statusTone: TeacherAssessmentStatusBadgeTone;
	assessmentDate: string;
	assessmentDateLabel: string;
	coveragePercent: number;
	coverageLabel: string;
	averagePercent: number | null;
	averageLabel: string;
	insightLabel: string;
	pendingResultsCount: number;
	primaryActionHref: string;
	primaryActionLabel: string;
	priorityRank: number;
};

export type TeacherAssessmentsPageData = {
	schema: TeacherSchemaState;
	classes: TeacherClassOption[];
	subjects: TeacherSubjectOption[];
	summaryMetrics: TeacherAssessmentsSummaryMetric[];
	actionItems: TeacherAssessmentActionItem[];
	rows: TeacherAssessmentTableRow[];
};

export type TeacherSubjectStatusTone = 'healthy' | 'attention' | 'critical' | 'pending';
export type TeacherSubjectsMetricTone = 'neutral' | 'attention' | 'critical' | 'positive';

export type TeacherSubjectsSummaryMetric = {
	label: string;
	value: string;
	tone: TeacherSubjectsMetricTone;
};

export type TeacherSubjectActionItem = {
	id: string;
	name: string;
	code: string | null;
	statusLabel: string;
	statusTone: TeacherSubjectStatusTone;
	classNames: string[];
	linkedClassesLabel: string;
	assessmentsLabel: string;
	coverageLabel: string;
	averageLabel: string;
	nextStepText: string;
	primaryActionHref: string;
	primaryActionLabel: string;
	secondaryActionHref: string | null;
	secondaryActionLabel: string | null;
};

export type TeacherSubjectCatalogItem = {
	id: string;
	name: string;
	code: string | null;
	classIds: string[];
	classNames: string[];
	statusLabel: string;
	statusTone: TeacherSubjectStatusTone;
	linkedClassesCount: number;
	assessmentsCount: number;
	publishedAssessmentsCount: number;
	draftAssessmentsCount: number;
	coveragePercent: number | null;
	coverageLabel: string;
	averagePercent: number | null;
	averageLabel: string;
	insightLabel: string;
	nextStepLabel: string;
	primaryActionHref: string;
	primaryActionLabel: string;
	secondaryActionHref: string | null;
	secondaryActionLabel: string | null;
	priorityRank: number;
};

export type TeacherSubjectsPageData = {
	schema: TeacherSchemaState;
	classes: TeacherClassOption[];
	subjectOptions: TeacherSubjectOption[];
	summaryMetrics: TeacherSubjectsSummaryMetric[];
	actionItems: TeacherSubjectActionItem[];
	catalog: TeacherSubjectCatalogItem[];
};
