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
		portal: payload.portal,
		summary: {
			studentName: payload.student.displayName,
			className: payload.student.className,
			...payload.summary
		},
		bestSubject: payload.bestSubject
			? {
					subjectId: payload.bestSubject.id,
					subjectName: payload.bestSubject.name,
					score: payload.bestSubject.score,
					progress: payload.bestSubject.progress,
					status: payload.bestSubject.status,
					description: payload.bestSubject.description
				}
			: null,
		prioritySubject: payload.prioritySubject
			? {
					subjectId: payload.prioritySubject.id,
					subjectName: payload.prioritySubject.name,
					score: payload.prioritySubject.score,
					progress: payload.prioritySubject.progress,
					status: payload.prioritySubject.status,
					description: payload.prioritySubject.description
				}
			: null,
		subjects: payload.subjects.map((subject) => ({
			subjectId: subject.id,
			subjectName: subject.name,
			score: subject.score,
			progress: subject.progress,
			status: subject.status,
			description: subject.description
		})),
		academicSummary: payload.academicSummary,
		longitudinal: payload.longitudinal
	};
};
