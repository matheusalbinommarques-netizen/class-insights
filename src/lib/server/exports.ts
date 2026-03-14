import type { OwnedAssessment } from './teacher';
import type { StudentLongitudinalProfile } from './student-longitudinal-profile';

type CsvValue = string | number | boolean | null | undefined;

function escapeCsvValue(value: CsvValue): string {
	if (value === null || value === undefined) return '';

	const normalized = String(value);
	if (/[",\n;]/.test(normalized)) {
		return `"${normalized.replaceAll('"', '""')}"`;
	}

	return normalized;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
	return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

export function buildPublishedAssessmentExport(input: {
	assessment: OwnedAssessment;
	students: Array<{ id: string; name: string }>;
	results: Array<{
		student_id: string;
		raw_score: number | null;
		score_min: number;
		score_max: number;
		score_decimals: number;
		is_excused: boolean;
		notes: string | null;
	}>;
}): string {
	const resultsByStudentId = new Map(input.results.map((row) => [row.student_id, row]));

	return toCsv(
		[
			'turma',
			'materia',
			'avaliacao',
			'data_avaliacao',
			'aluno_id',
			'aluno_nome',
			'nota_bruta',
			'percentual_normalizado',
			'dispensado',
			'observacoes'
		],
		input.students.map((student) => {
			const result = resultsByStudentId.get(student.id);
			const normalizedPercent =
				result && typeof result.raw_score === 'number' && result.score_max > result.score_min
					? Number(
							(
								((result.raw_score - result.score_min) / (result.score_max - result.score_min)) *
								100
							).toFixed(1)
						)
					: null;

			return [
				input.assessment.class_name,
				input.assessment.subject_name,
				input.assessment.title,
				input.assessment.assessment_date,
				student.id,
				student.name,
				result?.raw_score ?? null,
				normalizedPercent,
				result?.is_excused ?? false,
				result?.notes ?? ''
			];
		})
	);
}

export function buildStudentLongitudinalExport(input: {
	profile: StudentLongitudinalProfile;
}): string {
	const { profile } = input;

	return toCsv(
		[
			'aluno_id',
			'aluno_nome',
			'turma',
			'materia_id',
			'materia',
			'media_publicada',
			'percentual_publicado',
			'media_turma_percentual',
			'gap_percentual',
			'tendencia_recente',
			'ultima_avaliacao',
			'data_ultima_avaliacao',
			'total_avaliacoes_publicadas'
		],
		profile.subjects.map((subject) => [
			profile.student.id,
			profile.student.displayName,
			profile.student.className,
			subject.id,
			subject.name,
			subject.score,
			subject.progress,
			subject.classAverage,
			subject.gapPercent,
			subject.recentTrend,
			subject.latestAssessmentTitle,
			subject.latestAssessmentDate,
			subject.assessmentsCount
		])
	);
}
