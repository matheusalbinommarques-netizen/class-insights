import type { Cookies } from '@sveltejs/kit';
import type { StudentLongitudinalSummary } from '$lib/types/academic';
import {
	loadStudentLongitudinalProfile,
	type StudentLongitudinalProfile,
	type StudentLongitudinalSubject
} from './student-longitudinal-profile.ts';
import {
	buildPendingStudentPortalPayload,
	mapStudentPortalEnrollments,
	type StudentPortalEnrollment,
	type StudentPortalParentData
} from './student-portal.helpers.ts';
import {
	loadStudentEnrollments,
	readPreferredEnrollmentId,
	resolveStudentEnrollmentSelection
} from './student-enrollments.ts';

export {
	buildPendingStudentPortalPayload,
	mapStudentPortalEnrollments,
	type StudentPortalEnrollment,
	type StudentPortalParentData
} from './student-portal.helpers.ts';

export type StudentSubjectStatus = 'good' | 'attention' | 'pending';

export type StudentTrendDirection = 'estável' | 'em melhora' | 'em atenção' | 'base insuficiente';
export type StudentSubjectSituation = 'saudável' | 'em atenção' | 'base insuficiente';

export type StudentPortalSubject = {
	id: string;
	name: string;
	code: string | null;

	// Compatibilidade com a UI atual
	score: number | null;
	progress: number | null;
	status: StudentSubjectStatus;
	description: string;

	// Camada semântica nova
	currentAverage: number | null;
	normalizedPercent: number | null;
	trendDirection: StudentTrendDirection;
	subjectStatus: StudentSubjectSituation;

	assessmentsCount: number;
	latestAssessmentTitle: string | null;
	latestAssessmentDate: string | null;
	classAveragePercent: number | null;
	gapPercent: number | null;
};

export type StudentPortalPayload = {
	authUser: StudentPortalParentData['authUser'];
	portal: {
		status: 'pending-link' | 'ready';
		message: string;
	};
	student: {
		displayName: string;
		className: string | null;
	};
	summary: {
		totalSubjects: number;
		subjectsWithScore: number;
		goodSubjects: number;
		attentionSubjects: number;
		pendingSubjects: number;

		// Compatibilidade com a UI atual
		generalAverage: number | null;
		generalPercent: number | null;

		// Camada semântica nova
		currentAverage: number | null;
		normalizedPercent: number | null;
		trendDirection: StudentTrendDirection;
		classAveragePercent: number | null;
		gapPercent: number | null;
	};
	bestSubject: StudentPortalSubject | null;
	prioritySubject: StudentPortalSubject | null;
	subjects: StudentPortalSubject[];
	academicSummary: {
		title: string;
		description: string;
	};
	longitudinal: StudentLongitudinalSummary | null;
	enrollments: StudentPortalEnrollment[];
};

function isNumber(value: number | null | undefined): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function roundTo(value: number, decimals: number) {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

function normalizePercent(value: number | null | undefined) {
	if (!isNumber(value)) return null;
	return Math.max(0, Math.min(100, roundTo(value, 1)));
}

function percentToRealScale(
	percent: number | null | undefined,
	min: number,
	max: number,
	decimals: number
) {
	if (!isNumber(percent)) return null;

	const range = max - min;
	if (range <= 0) return null;

	const value = min + (percent / 100) * range;
	return roundTo(value, decimals);
}

export function deriveTrendDirection(
	rawTrend: StudentLongitudinalSummary['recent_trend'] | null | undefined
): StudentTrendDirection {
	switch (rawTrend) {
		case 'improving':
			return 'em melhora';
		case 'declining':
			return 'em atenção';
		case 'stable':
			return 'estável';
		default:
			return 'base insuficiente';
	}
}

export function deriveSubjectSituation(
	normalizedPercentValue: number | null | undefined
): StudentSubjectSituation {
	if (!isNumber(normalizedPercentValue)) {
		return 'base insuficiente';
	}

	if (normalizedPercentValue >= 70) {
		return 'saudável';
	}

	return 'em atenção';
}

export function mapLegacySubjectStatus(
	subjectSituation: StudentSubjectSituation
): StudentSubjectStatus {
	switch (subjectSituation) {
		case 'saudável':
			return 'good';
		case 'em atenção':
			return 'attention';
		default:
			return 'pending';
	}
}

export function buildSubjectDescription(
	subjectSituation: StudentSubjectSituation,
	trendDirection: StudentTrendDirection,
	normalizedPercentValue: number | null,
	latestAssessmentTitle: string | null
) {
	const latestReference = latestAssessmentTitle
		? ` Última publicação: ${latestAssessmentTitle}.`
		: '';

	if (subjectSituation === 'base insuficiente') {
		return `Ainda não há base publicada suficiente para esta matéria.${latestReference}`;
	}

	const normalizedLabel = isNumber(normalizedPercentValue)
		? `${roundTo(normalizedPercentValue, 1)}%`
		: 'sem percentual';

	if (subjectSituation === 'saudável') {
		if (trendDirection === 'em melhora') {
			return `Você está em melhora nesta matéria (${normalizedLabel} de aproveitamento normalizado).${latestReference}`;
		}

		return `Você está com situação saudável nesta matéria (${normalizedLabel} de aproveitamento normalizado).${latestReference}`;
	}

	if (trendDirection === 'em atenção') {
		return `Esta matéria pede atenção e mostra queda recente (${normalizedLabel} de aproveitamento normalizado).${latestReference}`;
	}

	return `Esta matéria pede atenção no momento (${normalizedLabel} de aproveitamento normalizado).${latestReference}`;
}

function mapSubjectToPortalSubject(
	profile: StudentLongitudinalProfile,
	subject: StudentLongitudinalSubject
): StudentPortalSubject {
	const normalizedPercentValue = normalizePercent(subject.progress);
	const currentAverage = percentToRealScale(
		normalizedPercentValue,
		profile.classroom.score_min,
		profile.classroom.score_max,
		profile.classroom.score_decimals
	);
	const trendDirection = deriveTrendDirection(subject.recentTrend);
	const subjectStatus = deriveSubjectSituation(normalizedPercentValue);
	const legacyStatus = mapLegacySubjectStatus(subjectStatus);

	return {
		id: subject.id,
		name: subject.name,
		code: subject.code,

		// Compatibilidade com a UI atual
		score: currentAverage,
		progress: normalizedPercentValue,
		status: legacyStatus,
		description: buildSubjectDescription(
			subjectStatus,
			trendDirection,
			normalizedPercentValue,
			subject.latestAssessmentTitle
		),

		// Camada semântica nova
		currentAverage,
		normalizedPercent: normalizedPercentValue,
		trendDirection,
		subjectStatus,

		assessmentsCount: subject.assessmentsCount,
		latestAssessmentTitle: subject.latestAssessmentTitle,
		latestAssessmentDate: subject.latestAssessmentDate,
		classAveragePercent: normalizePercent(subject.classAverage),
		gapPercent: isNumber(subject.gapPercent) ? roundTo(subject.gapPercent, 1) : null
	};
}

function buildSemanticSummary(profile: StudentLongitudinalProfile) {
	const normalizedPercentValue = normalizePercent(profile.summary.generalPercent);
	const currentAverage = percentToRealScale(
		normalizedPercentValue,
		profile.classroom.score_min,
		profile.classroom.score_max,
		profile.classroom.score_decimals
	);

	return {
		totalSubjects: profile.summary.totalSubjects,
		subjectsWithScore: profile.summary.subjectsWithScore,
		goodSubjects: profile.summary.goodSubjects,
		attentionSubjects: profile.summary.attentionSubjects,
		pendingSubjects: profile.summary.pendingSubjects,

		// Compatibilidade com a UI atual
		generalAverage: currentAverage,
		generalPercent: normalizedPercentValue,

		// Camada semântica nova
		currentAverage,
		normalizedPercent: normalizedPercentValue,
		trendDirection: deriveTrendDirection(profile.longitudinal?.recent_trend),
		classAveragePercent: normalizePercent(profile.summary.classAveragePercent),
		gapPercent: isNumber(profile.summary.gapPercent) ? roundTo(profile.summary.gapPercent, 1) : null
	};
}

function findMappedSubjectById(
	subjects: StudentPortalSubject[],
	subjectId: string | null | undefined
) {
	if (!subjectId) return null;
	return subjects.find((subject) => subject.id === subjectId) ?? null;
}

export async function loadStudentPortalData(
	locals: App.Locals,
	parentData: StudentPortalParentData,
	cookies?: Cookies
): Promise<StudentPortalPayload> {
	const authUser = parentData.authUser;
	const enrollmentRows = await loadStudentEnrollments(locals);
	const preferredEnrollmentId = cookies ? readPreferredEnrollmentId(cookies) : null;
	const enrollmentSelection = resolveStudentEnrollmentSelection(
		enrollmentRows,
		preferredEnrollmentId
	);

	const result = await loadStudentLongitudinalProfile(locals, {
		kind: 'student-self',
		authUserId: authUser.id,
		fallbackDisplayName: parentData.profile.display_name,
		preferredEnrollmentId: enrollmentSelection.selectedEnrollmentId
	});

	if (!result.ok) {
		const enrollments = mapStudentPortalEnrollments(
			enrollmentRows,
			enrollmentSelection.selectedEnrollmentId
		);

		const pendingPayload = buildPendingStudentPortalPayload(
			parentData,
			enrollments,
			result.message,
			result.title,
			result.description
		);

		return {
			...pendingPayload,
			summary: {
				...pendingPayload.summary,
				currentAverage: null,
				normalizedPercent: null,
				trendDirection: 'base insuficiente',
				classAveragePercent: null,
				gapPercent: null
			}
		};
	}

	const profile = result.profile;
	const enrollments = mapStudentPortalEnrollments(
		enrollmentRows,
		enrollmentSelection.selectedEnrollmentId ?? profile.student.enrollmentId
	);

	const subjects = profile.subjects
		.map((subject) => mapSubjectToPortalSubject(profile, subject))
		.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

	return {
		authUser,
		portal: {
			status: 'ready',
			message: 'Dados acadêmicos publicados carregados com sucesso.'
		},
		student: {
			displayName: profile.student.displayName,
			className: profile.student.className
		},
		summary: buildSemanticSummary(profile),
		bestSubject: findMappedSubjectById(subjects, profile.bestSubject?.id),
		prioritySubject: findMappedSubjectById(subjects, profile.prioritySubject?.id),
		subjects,
		academicSummary: profile.academicSummary,
		longitudinal: profile.longitudinal,
		enrollments
	};
}
