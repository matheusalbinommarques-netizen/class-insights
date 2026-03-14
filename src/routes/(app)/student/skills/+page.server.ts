import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { loadStudentPortalData } from '$lib/server/student-portal';

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

export const load: PageServerLoad = async ({ locals, parent }) => {
	const parentData = (await parent()) as ParentData;
	if (!parentData.authUser?.id) {
		throw redirect(302, '/login');
	}

	const payload = await loadStudentPortalData(locals, parentData);

	return {
		authUser: payload.authUser,
		subjectsPortal: payload.portal,
		student: payload.student,
		summary: payload.summary,
		bestSubject: payload.bestSubject
			? {
					id: payload.bestSubject.id,
					name: payload.bestSubject.name,
					progress: payload.bestSubject.progress,
					score: payload.bestSubject.score,
					status: payload.bestSubject.status,
					description: payload.bestSubject.description
				}
			: null,
		prioritySubject: payload.prioritySubject
			? {
					id: payload.prioritySubject.id,
					name: payload.prioritySubject.name,
					progress: payload.prioritySubject.progress,
					score: payload.prioritySubject.score,
					status: payload.prioritySubject.status,
					description: payload.prioritySubject.description
				}
			: null,
		subjects: payload.subjects.map((subject) => ({
			id: subject.id,
			name: subject.name,
			progress: subject.progress,
			score: subject.score,
			status: subject.status,
			description: subject.description,
			assessmentsCount: subject.assessmentsCount,
			latestAssessmentTitle: subject.latestAssessmentTitle,
			latestAssessmentDate: subject.latestAssessmentDate
		})),
		academicSummary: payload.academicSummary,
		longitudinal: payload.longitudinal,
		enrollments: payload.enrollments
	};
};
