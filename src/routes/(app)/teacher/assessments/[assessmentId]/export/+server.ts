import { error } from '@sveltejs/kit';
import { getAuthenticatedUserId } from '$lib/server/auth';
import { buildPublishedAssessmentExport } from '$lib/server/exports';
import { buildErrorMessage, createErrorId, logServerEvent } from '$lib/server/observability';
import { getOwnedAssessment } from '$lib/server/teacher';

type ExportResultRow = {
	student_id: string;
	raw_score: number | null;
	score_min: number;
	score_max: number;
	score_decimals: number;
	is_excused: boolean;
	notes: string | null;
};

export const GET = async ({ params, locals }) => {
	const userId = getAuthenticatedUserId(locals);
	if (!userId) {
		throw error(401, 'Voce precisa estar autenticado.');
	}

	const assessment = await getOwnedAssessment(locals, params.assessmentId, userId);
	if (!assessment) {
		throw error(404, 'Avaliacao nao encontrada.');
	}

	if (assessment.status !== 'published') {
		throw error(400, 'So e possivel exportar avaliacoes publicadas.');
	}

	const [{ data: studentsData, error: studentsError }, { data: resultsData, error: resultsError }] =
		await Promise.all([
			locals.supabase
				.from('students')
				.select('id, name')
				.eq('class_id', assessment.class_id)
				.order('name', { ascending: true }),
			locals.supabase
				.from('assessment_results')
				.select('student_id, raw_score, score_min, score_max, score_decimals, is_excused, notes')
				.eq('assessment_id', assessment.id)
		]);

	if (studentsError || resultsError) {
		const errorId = createErrorId('teacher_export');
		logServerEvent('error', 'teacher.assessment_export_failed', {
			errorId,
			userId,
			route: `/teacher/assessments/${assessment.id}/export`,
			assessmentId: assessment.id,
			studentsError: studentsError?.message ?? null,
			resultsError: resultsError?.message ?? null
		});
		throw error(500, buildErrorMessage('Nao foi possivel gerar o export da avaliacao.', errorId));
	}

	const csv = buildPublishedAssessmentExport({
		assessment,
		students: (studentsData ?? []) as Array<{ id: string; name: string }>,
		results: (resultsData ?? []) as ExportResultRow[]
	});

	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="assessment-${assessment.id}.csv"`
		}
	});
};
