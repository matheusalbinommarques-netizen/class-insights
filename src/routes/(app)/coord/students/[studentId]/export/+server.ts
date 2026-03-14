import { error } from '@sveltejs/kit';
import { getAuthenticatedUserId } from '$lib/server/auth';
import { buildStudentLongitudinalExport } from '$lib/server/exports';
import { buildErrorMessage, createErrorId, logServerEvent } from '$lib/server/observability';
import { loadStudentLongitudinalProfile } from '$lib/server/student-longitudinal-profile';

export const GET = async ({ params, locals }) => {
	const coordId = getAuthenticatedUserId(locals);
	if (!coordId) {
		throw error(401, 'Voce precisa estar autenticado.');
	}

	const result = await loadStudentLongitudinalProfile(locals, {
		kind: 'coord',
		coordId,
		studentId: params.studentId
	});

	if (!result.ok) {
		throw error(404, result.message);
	}

	try {
		const csv = buildStudentLongitudinalExport({
			profile: result.profile
		});

		return new Response(csv, {
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': `attachment; filename="student-longitudinal-${result.profile.student.id}.csv"`
			}
		});
	} catch (caught) {
		const errorId = createErrorId('coord_export');
		logServerEvent('error', 'coord.student_export_failed', {
			errorId,
			coordId,
			route: `/coord/students/${params.studentId}/export`,
			studentId: params.studentId,
			message: caught instanceof Error ? caught.message : 'unknown_error'
		});
		throw error(500, buildErrorMessage('Nao foi possivel gerar o export institucional.', errorId));
	}
};
