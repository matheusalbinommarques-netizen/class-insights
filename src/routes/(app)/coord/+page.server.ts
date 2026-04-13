import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { getAuthenticatedUserId, getProfileByUserId } from '$lib/server/auth';
import { loadCoordDashboard } from '$lib/server/coord';

type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';
type CoordTone = 'healthy' | 'attention' | 'critical';
type SummaryTone = 'default' | 'attention' | 'critical';

type CoordSummaryHighlight = {
	key: string;
	label: string;
	value: string;
	description: string;
	tone: SummaryTone;
};

type CoordClassDashboardItem = {
	classId: string;
	className: string;
	teacherId: string;
	teacherName: string;
	accessCode: string | null;
	studentsCount: number;
	publishedAssessments: number;
	averagePercent: number | null;
	riskStudents: number;
	tone: CoordTone;
	priorityScore: number;
	coveragePercent: number;
	lastPublishedAt: string | null;
	primaryReason: string;
	detailHref: string;
};

type CoordSubjectDashboardItem = {
	subjectId: string;
	subjectName: string;
	averagePercent: number | null;
	assessmentsCount: number;
	recentTrend: Trend;
	priorityScore: number;
	coveragePercent: number;
	lastPublishedAt: string | null;
	primaryReason: string;
	detailHref: string;
};

type CoordTeacherDashboardItem = {
	teacherId: string;
	teacherName: string;
	classesCount: number;
	averagePercent: number | null;
	publishedAssessments: number;
	priorityScore: number;
	coveragePercent: number;
	lastPublishedAt: string | null;
	primaryReason: string;
	detailHref: string;
};

type CoordStudentDashboardItem = {
	studentId: string;
	studentName: string;
	className: string;
	averagePercent: number;
	publishedAssessments: number;
	priorityScore: number;
	primaryReason: string;
	detailHref: string;
};

type CoordDashboardData = {
	summary: {
		displayName: string;
		totalClasses: number;
		totalStudents: number;
		totalPublishedAssessments: number;
		institutionAverage: number | null;
		classesAtRisk: number;
		managedClassesCount: number;
		message?: string;
		highlights?: CoordSummaryHighlight[];
	};
	classes: CoordClassDashboardItem[];
	subjects: CoordSubjectDashboardItem[];
	teachers: CoordTeacherDashboardItem[];
	students: CoordStudentDashboardItem[];
};

type CoordPrioritySeverity = 'critical' | 'attention' | 'healthy';

type CoordPriorityActionKind = 'class_focus' | 'subject_focus' | 'teacher_focus' | 'student_focus';

type CoordPriorityAction = {
	kind: CoordPriorityActionKind;
	priorityRank: number;
	title: string;
	reason: string;
	href: string;
	primaryLabel: string;
	sourceLabel: string | null;
	severity: CoordPrioritySeverity;
	score: number;
};

type CoordInstitutionalPriorities = {
	classFocus: CoordClassDashboardItem | null;
	subjectFocus: CoordSubjectDashboardItem | null;
	teacherFocus: CoordTeacherDashboardItem | null;
	studentFocus: CoordStudentDashboardItem[];
	queue: CoordPriorityAction[];
};

function sortByPriority<T extends { priorityScore: number; averagePercent?: number | null }>(
	items: T[]
): T[] {
	return [...items].sort((left, right) => {
		if (right.priorityScore !== left.priorityScore) {
			return right.priorityScore - left.priorityScore;
		}

		const leftAverage =
			typeof left.averagePercent === 'number' ? left.averagePercent : Number.POSITIVE_INFINITY;
		const rightAverage =
			typeof right.averagePercent === 'number' ? right.averagePercent : Number.POSITIVE_INFINITY;

		return leftAverage - rightAverage;
	});
}

function classifyPercentSeverity(value: number | null): CoordPrioritySeverity {
	if (typeof value !== 'number') return 'attention';
	if (value < 50) return 'critical';
	if (value < 70) return 'attention';
	return 'healthy';
}

function classifySubjectSeverity(item: CoordSubjectDashboardItem): CoordPrioritySeverity {
	if (typeof item.averagePercent !== 'number') return 'attention';

	if (item.averagePercent < 50) return 'critical';
	if (item.recentTrend === 'declining' && item.averagePercent < 70) return 'critical';
	if (item.averagePercent < 70 || item.recentTrend === 'declining') return 'attention';

	return 'healthy';
}

function classifyTeacherSeverity(item: CoordTeacherDashboardItem): CoordPrioritySeverity {
	if (typeof item.averagePercent !== 'number') return 'attention';

	if (item.averagePercent < 50) return 'critical';
	if (item.averagePercent < 70) return 'attention';
	if (item.coveragePercent < 70) return 'attention';

	return 'healthy';
}

function buildInstitutionalPriorities(dashboard: CoordDashboardData): CoordInstitutionalPriorities {
	const sortedClasses = sortByPriority(dashboard.classes);
	const sortedSubjects = sortByPriority(dashboard.subjects);
	const sortedTeachers = sortByPriority(dashboard.teachers);
	const sortedStudents = sortByPriority(dashboard.students);

	const classFocus = sortedClasses[0] ?? null;
	const subjectFocus = sortedSubjects[0] ?? null;
	const teacherFocus = sortedTeachers[0] ?? null;
	const studentFocus = sortedStudents.slice(0, 5);

	const queue: CoordPriorityAction[] = [];

	if (classFocus) {
		queue.push({
			kind: 'class_focus',
			priorityRank: 1,
			title: `Turma mais sensível: ${classFocus.className}`,
			reason: classFocus.primaryReason,
			href: classFocus.detailHref,
			primaryLabel: 'Abrir turma',
			sourceLabel: classFocus.teacherName,
			severity: classFocus.tone === 'critical' ? 'critical' : classFocus.tone,
			score: classFocus.priorityScore
		});
	}

	if (subjectFocus) {
		queue.push({
			kind: 'subject_focus',
			priorityRank: 2,
			title: `Matéria crítica: ${subjectFocus.subjectName}`,
			reason: subjectFocus.primaryReason,
			href: subjectFocus.detailHref,
			primaryLabel: 'Ver matéria',
			sourceLabel: null,
			severity: classifySubjectSeverity(subjectFocus),
			score: subjectFocus.priorityScore
		});
	}

	if (teacherFocus) {
		queue.push({
			kind: 'teacher_focus',
			priorityRank: 3,
			title: `Professor que pede cuidado: ${teacherFocus.teacherName}`,
			reason: teacherFocus.primaryReason,
			href: teacherFocus.detailHref,
			primaryLabel: 'Ver professor',
			sourceLabel: `${teacherFocus.classesCount} turma(s)`,
			severity: classifyTeacherSeverity(teacherFocus),
			score: teacherFocus.priorityScore
		});
	}

	for (const student of studentFocus.slice(0, 2)) {
		queue.push({
			kind: 'student_focus',
			priorityRank: 4,
			title: `Aluno prioritário: ${student.studentName}`,
			reason: student.primaryReason,
			href: student.detailHref,
			primaryLabel: 'Ver aluno',
			sourceLabel: student.className,
			severity: classifyPercentSeverity(student.averagePercent),
			score: student.priorityScore
		});
	}

	queue.sort((left, right) => {
		if (right.score !== left.score) {
			return right.score - left.score;
		}

		return left.priorityRank - right.priorityRank;
	});

	return {
		classFocus,
		subjectFocus,
		teacherFocus,
		studentFocus,
		queue
	};
}

function emptyPriorityState(): CoordInstitutionalPriorities {
	return {
		classFocus: null,
		subjectFocus: null,
		teacherFocus: null,
		studentFocus: [],
		queue: []
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const coordUserId = getAuthenticatedUserId(locals);

	if (!coordUserId) {
		throw error(401, 'Você precisa estar autenticado.');
	}

	const profile = await getProfileByUserId(locals, coordUserId);

	if (!profile) {
		throw error(404, 'Perfil de coordenação não encontrado.');
	}

	const dashboardResult = await loadCoordDashboard(locals, coordUserId, profile.display_name);

	if (!dashboardResult.ok) {
		return {
			profile,
			summary: null,
			classes: [],
			subjects: [],
			teachers: [],
			students: [],
			institutionalPriorities: emptyPriorityState(),
			error: dashboardResult.error
		};
	}

	const dashboard = dashboardResult.data as CoordDashboardData;
	const institutionalPriorities = buildInstitutionalPriorities(dashboard);

	return {
		profile,
		summary: dashboard.summary,
		classes: dashboard.classes,
		subjects: dashboard.subjects,
		teachers: dashboard.teachers,
		students: dashboard.students,
		institutionalPriorities,
		error: null
	};
};
