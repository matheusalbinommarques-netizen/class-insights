import type {
	LongitudinalPoint,
	StudentLongitudinalSummary,
	SubjectLongitudinalSummary
} from '$lib/types/academic';

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function resolveTrend(values: number[]): StudentLongitudinalSummary['recent_trend'] {
	if (values.length < 2) return 'insufficient_data';

	const firstHalf = values.slice(0, Math.floor(values.length / 2));
	const secondHalf = values.slice(Math.floor(values.length / 2));
	const start = average(firstHalf);
	const end = average(secondHalf);

	if (start === null || end === null) return 'insufficient_data';

	if (end - start >= 5) return 'improving';
	if (start - end >= 5) return 'declining';
	return 'stable';
}

export function buildStudentLongitudinalSummary(input: {
	student_id: string;
	student_name: string;
	timeline: LongitudinalPoint[];
}): StudentLongitudinalSummary {
	const sortedTimeline = [...input.timeline].sort((a, b) =>
		a.assessment_date.localeCompare(b.assessment_date)
	);

	const bySubject = new Map<string, { name: string; values: number[] }>();

	for (const point of sortedTimeline) {
		if (typeof point.normalized_percent !== 'number') continue;

		const current = bySubject.get(point.subject_id) ?? {
			name: point.subject_name,
			values: []
		};

		current.values.push(point.normalized_percent);
		bySubject.set(point.subject_id, current);
	}

	const subjectAverages = [...bySubject.values()]
		.map((subject) => ({
			name: subject.name,
			avg: average(subject.values)
		}))
		.filter((subject): subject is { name: string; avg: number } => typeof subject.avg === 'number')
		.sort((a, b) => b.avg - a.avg);

	const normalizedSeries = sortedTimeline
		.map((point) => point.normalized_percent)
		.filter((value): value is number => typeof value === 'number');

	return {
		student_id: input.student_id,
		student_name: input.student_name,
		best_subject: subjectAverages[0]?.name ?? null,
		worst_subject: subjectAverages.at(-1)?.name ?? null,
		recent_trend: resolveTrend(normalizedSeries),
		timeline: sortedTimeline
	};
}

export function buildSubjectLongitudinalSummaries(
	timeline: LongitudinalPoint[]
): SubjectLongitudinalSummary[] {
	const bySubject = new Map<
		string,
		{
			subject_name: string;
			points: LongitudinalPoint[];
		}
	>();

	for (const point of timeline) {
		const current = bySubject.get(point.subject_id) ?? {
			subject_name: point.subject_name,
			points: []
		};

		current.points.push(point);
		bySubject.set(point.subject_id, current);
	}

	return [...bySubject.entries()]
		.map(([subject_id, subject]) => {
			const sortedPoints = [...subject.points].sort((a, b) =>
				a.assessment_date.localeCompare(b.assessment_date)
			);
			const normalizedValues = sortedPoints
				.map((point) => point.normalized_percent)
				.filter((value): value is number => typeof value === 'number');

			const averagePercent = average(normalizedValues);

			return {
				subject_id,
				subject_name: subject.subject_name,
				assessments_count: sortedPoints.length,
				average_percent:
					averagePercent === null ? null : Math.round(Number(averagePercent.toFixed(2))),
				recent_trend: resolveTrend(normalizedValues),
				latest_assessment_date: sortedPoints.at(-1)?.assessment_date ?? null
			};
		})
		.sort((a, b) => a.subject_name.localeCompare(b.subject_name, 'pt-BR'));
}
