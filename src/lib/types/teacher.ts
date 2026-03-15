import type { PublicationStatus } from './academic';

export type TeacherSchemaState =
	| {
			ready: true;
			message: null;
	  }
	| {
			ready: false;
			message: string;
	  };

export type TeacherClassOption = {
	id: string;
	name: string;
};

export type TeacherSubjectOption = {
	id: string;
	name: string;
	code: string | null;
	classIds: string[];
};

export type TeacherAssessmentCard = {
	id: string;
	title: string;
	assessmentDate: string;
	weight: number;
	status: PublicationStatus;
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
	status: PublicationStatus;
	className: string;
	subjectName: string;
	coveragePercent: number;
	averagePercent: number | null;
	riskStudentsCount: number;
	belowTargetCount: number;
	dispersionPercent: number | null;
	consistencyBand: 'consistent' | 'mixed' | 'spread' | 'pending';
	tone: 'healthy' | 'attention' | 'critical' | 'pending';
};

export type TeacherSubjectCard = {
	id: string;
	name: string;
	code: string | null;
	classIds: string[];
	classNames: string[];
};

export type TeacherClassStudent = {
	id: string;
	name: string;
	invite_code: string | null;
	created_at: string;
};

export type TeacherClassSubjectCard = {
	id: string;
	name: string;
	code: string | null;
	assessments: {
		id: string;
		title: string;
		assessmentDate: string;
		weight: number;
		status: PublicationStatus;
		publishedAt: string | null;
		resultsCount: number;
	}[];
};

export type TeacherDashboardClassCard = {
	id: string;
	name: string;
	created_at: string;
	scaleLabel: string;
	studentsCount: number;
	subjectsCount: number;
	assessmentsCount: number;
	publishedAssessmentsCount: number;
	draftAssessmentsCount: number;
	readyToPublishCount: number;
	totalExpectedResults: number;
	filledResultsCount: number;
	pendingResultsCount: number;
	draftCoveragePercent: number;
	publishedCoveragePercent: number;
	averagePercent: number | null;
	riskStudentsCount: number;
	latestPublicationDate: string | null;
	trendDelta: number | null;
	focusSubjects: Array<{
		subjectId: string;
		subjectName: string;
		averagePercent: number;
		gapVsClassAverage: number | null;
		assessmentsCount: number;
		tone: 'healthy' | 'attention' | 'critical';
	}>;
	status: 'setup' | 'healthy' | 'attention' | 'critical';
};

export type TeacherActionQueueItem = {
	id: string;
	classId: string;
	title: string;
	description: string;
	ctaLabel: string;
	href: string;
	priority: number;
	signalType: 'operational' | 'pedagogical';
};

export type TeacherDashboardSummary = {
	displayName: string;
	totalClasses: number;
	totalStudents: number;
	totalDraftAssessments: number;
	totalPublishedAssessments: number;
	totalPendingPublications: number;
	totalRiskStudents: number;
	totalPendingCells: number;
	classesAtRisk: number;
	classesInSetup: number;
	healthyClasses: number;
	message: string;
};

export type TeacherDashboardRiskTone = 'critical' | 'attention' | 'neutral';
export type TeacherDashboardTrendTone = 'positive' | 'neutral' | 'negative';

export type TeacherDashboardActionNow = {
	draftClasses: number;
	belowReferenceSubjects: number;
	fallingStudents: number;
	classesWithoutSubject: number;
	nextStepTitle: string;
	nextStepText: string;
	nextStepHref: string;
};

export type TeacherDashboardPerformanceSubjectItem = {
	subjectName: string;
	scoreLabel: string;
	helperText: string;
	href: string;
};

export type TeacherDashboardPerformanceStudentItem = {
	studentName: string;
	publishedAverageLabel: string;
	riskLabel: string;
	riskTone: TeacherDashboardRiskTone;
	helperText: string;
	href: string;
};

export type TeacherDashboardPerformanceGapItem = {
	studentName: string;
	gapLabel: string;
	riskLabel: string;
	riskTone: TeacherDashboardRiskTone;
	helperText: string;
	subjects: string[];
	href: string;
};

export type TeacherDashboardPerformanceChanges = {
	belowReferenceSubjects: TeacherDashboardPerformanceSubjectItem[];
	belowReferenceSubjectsHref: string;
	fallingStudents: TeacherDashboardPerformanceStudentItem[];
	fallingStudentsHref: string;
	relevantGaps: TeacherDashboardPerformanceGapItem[];
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
};

export type TeacherDashboardAnalyticsBucket = {
	label: string;
	value: number;
	heightPercent: number;
};

export type TeacherDashboardAnalyticsSummary = {
	rangeLabel: string;
	buckets: TeacherDashboardAnalyticsBucket[];
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

export type TeacherRiskStudentCard = {
	studentId: string;
	studentName: string;
	classId: string;
	className: string;
	averagePercent: number;
	publishedAssessmentsCount: number;
	riskLevel: 'high' | 'medium';
};

export type TeacherStudentComparisonCard = {
	studentId: string;
	studentName: string;
	classId: string;
	className: string;
	studentAveragePercent: number;
	classAveragePercent: number;
	gapPercent: number;
	publishedAssessmentsCount: number;
};

export type TeacherAssessmentDropCard = {
	classId: string;
	className: string;
	subjectId: string;
	subjectName: string;
	latestAssessmentId: string;
	latestAssessmentDate: string;
	previousAssessmentDate: string;
	latestAveragePercent: number;
	previousAveragePercent: number;
	dropPercent: number;
	sampleSize: number;
};
