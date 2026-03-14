import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

import { buildErrorMessage, createErrorId, logServerEvent } from '$lib/server/observability';
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

export const load: PageServerLoad = async ({ locals, parent, cookies }) => {
	const parentData = (await parent()) as ParentData;
	if (!parentData.authUser?.id) {
		throw redirect(302, '/login');
	}

	const payload = await loadStudentPortalData(locals, parentData, cookies);

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
		longitudinal: payload.longitudinal,
		enrollments: payload.enrollments
	};
};

export const actions: Actions = {
	claimInviteCode: async ({ request, locals }) => {
		const form = await request.formData();
		const inviteCode = String(form.get('inviteCode') ?? '')
			.trim()
			.toUpperCase();

		if (!locals.session) {
			return fail(401, {
				action: 'claimInviteCode',
				message: 'Voce precisa estar logado para adicionar um codigo.'
			});
		}

		if (!inviteCode) {
			return fail(400, {
				action: 'claimInviteCode',
				message: 'Informe um codigo de convite valido.',
				inviteCode
			});
		}

		const { data, error } = await locals.supabase.rpc('claim_student_by_invite_code', {
			p_invite_code: inviteCode
		});

		if (error) {
			const errorId = createErrorId('student_claim');
			logServerEvent('error', 'student.claim_invite_code_failed', {
				errorId,
				userId: locals.session.user.id,
				route: '/student',
				action: 'claimInviteCode',
				inviteCode,
				supabaseMessage: error.message
			});
			return fail(400, {
				action: 'claimInviteCode',
				message: buildErrorMessage(error.message, errorId),
				inviteCode
			});
		}

		const rows = (data ?? []) as Array<{ student_id: string }>;
		if (rows.length === 0) {
			return fail(404, {
				action: 'claimInviteCode',
				message: 'Nao encontramos um vinculo disponivel para esse codigo.',
				inviteCode
			});
		}

		return {
			action: 'claimInviteCode',
			success: true,
			message: 'Vinculo concluido com sucesso.'
		};
	}
};
