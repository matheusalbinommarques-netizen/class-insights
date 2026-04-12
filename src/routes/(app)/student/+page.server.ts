import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
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

type ClaimFormState = {
	action: 'claimInviteCode';
	message: string;
	values: {
		invite_code: string;
	};
};

function normalizeInviteCode(raw: FormDataEntryValue | null) {
	return String(raw ?? '')
		.trim()
		.toUpperCase()
		.replace(/\s+/g, '');
}

export const load: PageServerLoad = async ({ locals, parent, cookies }) => {
	const parentData = (await parent()) as ParentData;

	if (!parentData.authUser?.id) {
		throw redirect(302, '/login');
	}

	const payload = await loadStudentPortalData(locals, parentData, cookies);

	return {
		authUser: payload.authUser,
		overviewPortal: payload.portal,
		student: payload.student,
		summary: payload.summary,
		bestSubject: payload.bestSubject
			? {
					id: payload.bestSubject.id,
					name: payload.bestSubject.name,
					progress: payload.bestSubject.progress,
					score: payload.bestSubject.score,
					status: payload.bestSubject.status,
					description: payload.bestSubject.description,
					assessmentsCount: payload.bestSubject.assessmentsCount,
					latestAssessmentTitle: payload.bestSubject.latestAssessmentTitle,
					latestAssessmentDate: payload.bestSubject.latestAssessmentDate
				}
			: null,
		prioritySubject: payload.prioritySubject
			? {
					id: payload.prioritySubject.id,
					name: payload.prioritySubject.name,
					progress: payload.prioritySubject.progress,
					score: payload.prioritySubject.score,
					status: payload.prioritySubject.status,
					description: payload.prioritySubject.description,
					assessmentsCount: payload.prioritySubject.assessmentsCount,
					latestAssessmentTitle: payload.prioritySubject.latestAssessmentTitle,
					latestAssessmentDate: payload.prioritySubject.latestAssessmentDate
				}
			: null,
		subjects: payload.subjects.map((subject) => ({
			id: subject.id,
			name: subject.name,
			code: subject.code,
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

export const actions: Actions = {
	claimInviteCode: async ({ request, locals }) => {
		const form = await request.formData();
		const inviteCode = normalizeInviteCode(form.get('invite_code'));

		if (!inviteCode) {
			return fail(400, {
				action: 'claimInviteCode',
				message: 'Informe um código de convite.',
				values: {
					invite_code: ''
				}
			} satisfies ClaimFormState);
		}

		const { error } = await locals.supabase.rpc('claim_student_by_invite_code', {
			p_invite_code: inviteCode
		});

		if (error) {
			return fail(400, {
				action: 'claimInviteCode',
				message: error.message ?? 'Não foi possível vincular este código agora.',
				values: {
					invite_code: inviteCode
				}
			} satisfies ClaimFormState);
		}

		throw redirect(303, '/student');
	}
};
