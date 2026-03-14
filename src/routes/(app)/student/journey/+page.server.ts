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
		journeyPortal: payload.portal,
		student: payload.student,
		summary: payload.summary,
		bestSubject: payload.bestSubject,
		prioritySubject: payload.prioritySubject,
		academicSummary: payload.academicSummary,
		longitudinal: payload.longitudinal,
		subjects: payload.subjects
	};
};
