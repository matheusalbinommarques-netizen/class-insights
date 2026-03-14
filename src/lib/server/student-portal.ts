import type { StudentLongitudinalSummary } from '$lib/types/academic';
import { loadStudentLongitudinalProfile } from './student-longitudinal-profile';

type ParentData = {
	authUser: {
		id: string;
		email: string | null;
	};
	profile: {
		id: string;
		role: 'teacher' | 'student' | 'coord';
		display_name: string;
	};
};

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
	authUser: ParentData['authUser'];
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
};

function buildPendingPayload(
	parentData: ParentData,
	message: string,
	title: string,
	description: string
): StudentPortalPayload {
	return {
		authUser: parentData.authUser,
		portal: {
			status: 'pending-link',
			message
		},
		student: {
			displayName: parentData.profile.display_name,
			className: null
		},
		summary: {
			totalSubjects: 0,
			subjectsWithScore: 0,
			goodSubjects: 0,
			attentionSubjects: 0,
			pendingSubjects: 0,
			generalAverage: null,
			generalPercent: null
		},
		bestSubject: null,
		prioritySubject: null,
		subjects: [],
		academicSummary: {
			title,
			description
		},
		longitudinal: null
	};
}

export async function loadStudentPortalData(
	locals: App.Locals,
	parentData: ParentData
): Promise<StudentPortalPayload> {
	const authUser = parentData.authUser;
	const result = await loadStudentLongitudinalProfile(locals, {
		kind: 'student-self',
		authUserId: authUser.id,
		fallbackDisplayName: parentData.profile.display_name
	});

	if (!result.ok) {
		return buildPendingPayload(parentData, result.message, result.title, result.description);
	}

	const profile = result.profile;
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
		longitudinal: profile.longitudinal
	};
}
