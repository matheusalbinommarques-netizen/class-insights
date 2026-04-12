import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

import { getCurrentAuthUser, getProfileByUserId } from '$lib/server/auth';
import {
	clearPreferredEnrollmentId,
	loadStudentEnrollments,
	persistPreferredEnrollmentId,
	readPreferredEnrollmentId,
	resolveStudentEnrollmentSelection
} from '$lib/server/student-enrollments';
import { mapStudentPortalEnrollments } from '$lib/server/student-portal.helpers';

type EnrollmentState = 'active' | 'pending_only' | 'none';

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	const authUser = await getCurrentAuthUser(locals);

	if (!authUser) {
		const redirectTo = `${url.pathname}${url.search}`;
		throw redirect(302, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const profile = await getProfileByUserId(locals, authUser.id);

	if (!profile) {
		throw redirect(302, '/login');
	}

	if (profile.role !== 'student') {
		if (profile.role === 'teacher' || profile.role === 'coord') {
			throw redirect(302, profile.role === 'coord' ? '/coord' : '/teacher');
		}

		throw redirect(302, '/login');
	}

	const enrollmentRows = await loadStudentEnrollments(locals);
	const preferredEnrollmentId = readPreferredEnrollmentId(cookies);
	const enrollmentSelection = resolveStudentEnrollmentSelection(
		enrollmentRows,
		preferredEnrollmentId
	);

	if (
		enrollmentSelection.selectedEnrollmentId &&
		enrollmentSelection.selectedEnrollmentId !== preferredEnrollmentId
	) {
		persistPreferredEnrollmentId(cookies, enrollmentSelection.selectedEnrollmentId);
	} else if (!enrollmentSelection.selectedEnrollmentId && preferredEnrollmentId) {
		clearPreferredEnrollmentId(cookies);
	}

	const enrollments = mapStudentPortalEnrollments(
		enrollmentRows,
		enrollmentSelection.selectedEnrollmentId
	);

	const activeEnrollment = enrollments.find((item) => item.isCurrent) ?? null;
	const activeEnrollmentsCount = enrollments.filter((item) => item.status === 'active').length;
	const pendingEnrollmentsCount = enrollments.filter((item) => item.status === 'pending').length;
	const archivedEnrollmentsCount = enrollments.filter((item) => item.status === 'archived').length;

	const enrollmentState: EnrollmentState =
		activeEnrollmentsCount > 0 ? 'active' : pendingEnrollmentsCount > 0 ? 'pending_only' : 'none';

	return {
		authUser,
		profile: {
			id: profile.id,
			role: profile.role,
			display_name: profile.display_name
		},
		enrollments,
		enrollmentSummary: {
			state: enrollmentState,
			hasMultipleActiveEnrollments: activeEnrollmentsCount > 1,
			activeEnrollmentsCount,
			pendingEnrollmentsCount,
			archivedEnrollmentsCount,
			currentEnrollmentId: enrollmentSelection.selectedEnrollmentId,
			currentClassId: enrollmentSelection.currentClassId,
			currentStudentId: enrollmentSelection.currentStudentId,
			currentClassName: activeEnrollment?.className ?? null,
			statusTitle:
				enrollmentState === 'active'
					? 'Turma ativa definida'
					: enrollmentState === 'pending_only'
						? 'Vínculo pendente'
						: 'Sem vínculo acadêmico',
			statusDescription:
				enrollmentState === 'active'
					? activeEnrollmentsCount > 1
						? 'Você pode trocar sua turma ativa a qualquer momento no shell do aluno.'
						: 'Sua turma ativa já está selecionada para leitura do portal.'
					: enrollmentState === 'pending_only'
						? 'Sua conta existe, mas seus vínculos ainda não ficaram ativos. Isso não é erro: assim que um vínculo ativar, ele aparecerá como turma ativa.'
						: 'Sua conta de aluno está pronta, mas ainda não há vínculo acadêmico disponível. Quando existir um vínculo ativo, ele aparecerá automaticamente aqui.'
		}
	};
};
