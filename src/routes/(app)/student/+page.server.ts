import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

import { getAuthenticatedUserId } from '$lib/server/auth';
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

type ClaimStudentRpcRow = {
	student_id: string;
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
			...payload.summary,
			publishedAssessments: payload.longitudinal?.timeline.length ?? 0,
			recentTrend: payload.longitudinal?.recent_trend ?? 'insufficient_data',
			bestSubjectName: payload.longitudinal?.best_subject ?? null,
			weakestSubjectName: payload.longitudinal?.worst_subject ?? null
		},
		bestSubject: payload.bestSubject
			? {
					subjectId: payload.bestSubject.id,
					subjectName: payload.bestSubject.name,
					score: payload.bestSubject.score,
					progress: payload.bestSubject.progress,
					status: payload.bestSubject.status,
					description: payload.bestSubject.description,
					assessmentsCount: payload.bestSubject.assessmentsCount,
					latestAssessmentTitle: payload.bestSubject.latestAssessmentTitle,
					latestAssessmentDate: payload.bestSubject.latestAssessmentDate
				}
			: null,
		prioritySubject: payload.prioritySubject
			? {
					subjectId: payload.prioritySubject.id,
					subjectName: payload.prioritySubject.name,
					score: payload.prioritySubject.score,
					progress: payload.prioritySubject.progress,
					status: payload.prioritySubject.status,
					description: payload.prioritySubject.description,
					assessmentsCount: payload.prioritySubject.assessmentsCount,
					latestAssessmentTitle: payload.prioritySubject.latestAssessmentTitle,
					latestAssessmentDate: payload.prioritySubject.latestAssessmentDate
				}
			: null,
		subjects: payload.subjects.map((subject) => ({
			subjectId: subject.id,
			subjectName: subject.name,
			score: subject.score,
			progress: subject.progress,
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
		const inviteCode = String(form.get('inviteCode') ?? '')
			.trim()
			.toUpperCase();

		const userId = getAuthenticatedUserId(locals);

		if (!userId) {
			return fail(401, {
				action: 'claimInviteCode',
				message: 'Você precisa estar logado para adicionar um código.'
			});
		}

		if (!inviteCode) {
			return fail(400, {
				action: 'claimInviteCode',
				message: 'Informe um código de convite válido.',
				inviteCode
			});
		}

		const { data, error } = await locals.supabase.rpc('claim_student_by_invite_code', {
			p_invite_code: inviteCode
		});

		if (error) {
			const errorId = createErrorId('student_claim_invite');
			logServerEvent('error', 'student.claim_invite_code_failed', {
				errorId,
				userId,
				inviteCode,
				message: error.message
			});

			return fail(400, {
				action: 'claimInviteCode',
				message: buildErrorMessage('Não foi possível validar o código agora.', errorId),
				inviteCode
			});
		}

		const rows = ((data ?? []) as ClaimStudentRpcRow[]).filter(
			(row) => typeof row?.student_id === 'string' && row.student_id.length > 0
		);

		if (rows.length === 0) {
			return fail(400, {
				action: 'claimInviteCode',
				message: 'Não encontramos um vínculo ativo para esse código.',
				inviteCode
			});
		}

		return {
			success: true,
			action: 'claimInviteCode',
			message: 'Código adicionado com sucesso.'
		};
	}
};
