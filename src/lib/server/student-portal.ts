import type { StudentLongitudinalSummary } from '$lib/types/academic';
import { loadStudentLongitudinalProfile } from './student-longitudinal-profile.ts';
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

export type StudentPortalSubject = {
	id: string;
	name: string;
	code: string | null;
	score: number | null;
	progress: number | null;
	status: StudentSubjectStatus;
	description: string;
	assessmentsCount: number;
	latestAssessmentTitle: string | null;
	latestAssessmentDate: string | null;
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
		generalAverage: number | null;
		generalPercent: number | null;
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

export async function loadStudentPortalData(
	locals: App.Locals,
	parentData: StudentPortalParentData,
	cookies?: import('@sveltejs/kit').Cookies
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
		return buildPendingStudentPortalPayload(
			parentData,
			enrollments,
			result.message,
			result.title,
			result.description
		);
	}

	const profile = result.profile;
	const enrollments = mapStudentPortalEnrollments(
		enrollmentRows,
		enrollmentSelection.selectedEnrollmentId ?? profile.student.enrollmentId
	);
	const subjects: StudentPortalSubject[] = profile.subjects.map((subject) => ({
		id: subject.id,
		name: subject.name,
		code: subject.code,
		score: subject.score,
		progress: subject.progress,
		status: subject.status,
		description: subject.description,
		assessmentsCount: subject.assessmentsCount,
		latestAssessmentTitle: subject.latestAssessmentTitle,
		latestAssessmentDate: subject.latestAssessmentDate
	}));

	return {
		authUser,
		portal: {
			status: 'ready',
			message: 'Dados academicos publicados carregados com sucesso.'
		},
		student: {
			displayName: profile.student.displayName,
			className: profile.student.className
		},
		summary: {
			totalSubjects: profile.summary.totalSubjects,
			subjectsWithScore: profile.summary.subjectsWithScore,
			goodSubjects: profile.summary.goodSubjects,
			attentionSubjects: profile.summary.attentionSubjects,
			pendingSubjects: profile.summary.pendingSubjects,
			generalAverage: profile.summary.generalAverage,
			generalPercent: profile.summary.generalPercent
		},
		bestSubject: subjects.find((subject) => subject.id === profile.bestSubject?.id) ?? null,
		prioritySubject: subjects.find((subject) => subject.id === profile.prioritySubject?.id) ?? null,
		subjects,
		academicSummary: profile.academicSummary,
		longitudinal: profile.longitudinal,
		enrollments
	};
}
