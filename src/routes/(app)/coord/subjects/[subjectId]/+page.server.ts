import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAuthenticatedUserId } from '$lib/server/auth';

type ScopeClassRow = {
	class_id: string;
	class_name: string;
	teacher_id: string;
	teacher_name: string;
	access_code: string | null;
};

type AssessmentRow = {
	id: string;
	title: string;
	class_id: string;
	assessment_date: string;
};

type ResultRow = {
	assessment_id: string;
	student_id: string;
	raw_score: number | null;
	score_min: number;
	score_max: number;
	is_excused: boolean;
};

type StudentRow = {
	id: string;
	name: string;
	class_id: string;
	class_name: string;
};

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

function normalizePercent(rawScore: number | null, min: number, max: number): number | null {
	if (typeof rawScore !== 'number') return null;
	const range = max - min;
	if (range <= 0) return null;
	return ((rawScore - min) / range) * 100;
}

function formatLabel(value: number | null) {
	if (typeof value !== 'number') return '--';

	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	}).format(value / 10);
}

function classifyTrend(series: Array<{ assessmentDate: string; averagePercent: number | null }>) {
	const valid = series
		.filter((item) => typeof item.averagePercent === 'number')
		.sort((left, right) => left.assessmentDate.localeCompare(right.assessmentDate));

	if (valid.length < 2) return 'insufficient_data' as const;

	const midpoint = Math.floor(valid.length / 2);
	const firstHalf = valid.slice(0, midpoint);
	const secondHalf = valid.slice(midpoint);

	const start = average(firstHalf.map((item) => item.averagePercent ?? 0));
	const end = average(secondHalf.map((item) => item.averagePercent ?? 0));

	if (typeof start !== 'number' || typeof end !== 'number') return 'insufficient_data' as const;

	const delta = end - start;

	if (delta >= 5) return 'improving' as const;
	if (delta <= -5) return 'declining' as const;
	return 'stable' as const;
}

function classifyClassStatus(value: number | null) {
	if (typeof value !== 'number') return 'pending' as const;
	if (value < 50) return 'critical' as const;
	if (value < 70) return 'attention' as const;
	return 'healthy' as const;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const coordId = getAuthenticatedUserId(locals);

	if (!coordId) {
		throw error(401, 'Voce precisa estar autenticado.');
	}

	const { data: scopeData, error: scopeError } = await locals.supabase.rpc('coord_scope_classes');

	if (scopeError) {
		throw error(500, 'Nao foi possivel carregar o escopo da coordenacao.');
	}

	const scopeClasses = (scopeData ?? []) as ScopeClassRow[];
	const classIds = scopeClasses.map((item) => item.class_id);

	if (classIds.length === 0) {
		throw error(404, 'Nenhuma turma encontrada no escopo da coordenacao.');
	}

	const { data: subjectLinksData, error: subjectLinksError } = await locals.supabase
		.from('class_subjects')
		.select('class_id, subject_id, subjects(name)')
		.eq('subject_id', params.subjectId)
		.in('class_id', classIds);

	if (subjectLinksError) {
		throw error(500, 'Nao foi possivel carregar a materia no escopo da coordenacao.');
	}

	const subjectLinks = (subjectLinksData ?? []) as Array<{
		class_id: string;
		subject_id: string;
		subjects: { name: string } | { name: string }[] | null;
	}>;

	if (subjectLinks.length === 0) {
		throw error(404, 'Materia nao encontrada no escopo da coordenacao.');
	}

	const subjectName = Array.isArray(subjectLinks[0]?.subjects)
		? (subjectLinks[0]?.subjects[0]?.name ?? 'Materia')
		: (subjectLinks[0]?.subjects?.name ?? 'Materia');

	const scopedClassIdsForSubject = unique(subjectLinks.map((item) => item.class_id));

	const { data: assessmentsData, error: assessmentsError } = await locals.supabase
		.from('assessments')
		.select('id, title, class_id, assessment_date')
		.eq('subject_id', params.subjectId)
		.eq('status', 'published')
		.in('class_id', scopedClassIdsForSubject)
		.order('assessment_date', { ascending: true });

	if (assessmentsError) {
		throw error(500, 'Nao foi possivel carregar as publicacoes da materia.');
	}

	const assessments = (assessmentsData ?? []) as AssessmentRow[];
	const assessmentIds = assessments.map((item) => item.id);

	let results: ResultRow[] = [];

	if (assessmentIds.length > 0) {
		const { data: resultsData, error: resultsError } = await locals.supabase
			.from('assessment_results')
			.select('assessment_id, student_id, raw_score, score_min, score_max, is_excused')
			.in('assessment_id', assessmentIds);

		if (resultsError) {
			throw error(500, 'Nao foi possivel carregar os resultados da materia.');
		}

		results = (resultsData ?? []) as ResultRow[];
	}

	const { data: studentsData, error: studentsError } = await locals.supabase
		.from('students')
		.select('id, name, class_id, classes(name)')
		.in('class_id', scopedClassIdsForSubject);

	if (studentsError) {
		throw error(500, 'Nao foi possivel carregar os alunos do escopo da materia.');
	}

	const students = (
		(studentsData ?? []) as Array<{
			id: string;
			name: string;
			class_id: string;
			classes: { name: string } | { name: string }[] | null;
		}>
	).map<StudentRow>((row) => ({
		id: row.id,
		name: row.name,
		class_id: row.class_id,
		class_name: Array.isArray(row.classes)
			? (row.classes[0]?.name ?? 'Turma')
			: (row.classes?.name ?? 'Turma')
	}));

	const classById = new Map(scopeClasses.map((item) => [item.class_id, item]));

	const normalizedResults = results
		.filter((item) => !item.is_excused)
		.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
		.filter((value): value is number => typeof value === 'number');

	const subjectAverage = average(normalizedResults);

	const trendSeries = assessments.map((assessment) => {
		const perAssessmentScores = results
			.filter((item) => item.assessment_id === assessment.id && !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		return {
			assessmentDate: assessment.assessment_date,
			averagePercent: average(perAssessmentScores)
		};
	});

	const recentTrend = classifyTrend(trendSeries);

	const classCards = scopedClassIdsForSubject.map((classId) => {
		const relatedAssessments = assessments.filter((item) => item.class_id === classId);
		const relatedAssessmentIds = relatedAssessments.map((item) => item.id);
		const relatedResults = results.filter((item) =>
			relatedAssessmentIds.includes(item.assessment_id)
		);

		const normalized = relatedResults
			.filter((item) => !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		const averagePercent = average(normalized);

		const studentsAtRisk = unique(
			relatedResults
				.filter((item) => {
					const normalizedValue = normalizePercent(item.raw_score, item.score_min, item.score_max);
					return typeof normalizedValue === 'number' && normalizedValue < 60;
				})
				.map((item) => item.student_id)
		).length;

		const classroom = classById.get(classId);

		return {
			classId,
			className: classroom?.class_name ?? 'Turma',
			teacherName: classroom?.teacher_name ?? 'Professor',
			averagePercent,
			averageLabel: formatLabel(averagePercent),
			assessmentsCount: relatedAssessments.length,
			studentsAtRisk,
			status: classifyClassStatus(averagePercent),
			detailHref: `/coord/classes/${classId}`
		};
	});

	const studentCards = students
		.map((student) => {
			const studentResults = results.filter((item) => item.student_id === student.id);

			const normalized = studentResults
				.filter((item) => !item.is_excused)
				.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
				.filter((value): value is number => typeof value === 'number');

			const averagePercent = average(normalized);

			if (typeof averagePercent !== 'number') return null;

			return {
				studentId: student.id,
				studentName: student.name,
				className: student.class_name,
				averagePercent,
				averageLabel: formatLabel(averagePercent),
				publishedAssessments: unique(studentResults.map((item) => item.assessment_id)).length,
				detailHref: `/coord/students/${student.id}`
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null)
		.sort((left, right) => left.averagePercent - right.averagePercent);

	const timeline = assessments.map((assessment) => {
		const relatedResults = results.filter((item) => item.assessment_id === assessment.id);

		const normalized = relatedResults
			.filter((item) => !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		return {
			assessmentId: assessment.id,
			assessmentTitle: assessment.title,
			assessmentDate: assessment.assessment_date,
			className: classById.get(assessment.class_id)?.class_name ?? 'Turma',
			averageLabel: formatLabel(average(normalized))
		};
	});

	return {
		subject: {
			id: params.subjectId,
			name: subjectName
		},
		summary: {
			classesCount: scopedClassIdsForSubject.length,
			studentsCount: students.length,
			publishedAssessments: assessments.length,
			averagePercent: subjectAverage,
			averageLabel: formatLabel(subjectAverage),
			recentTrend
		},
		classes: classCards,
		students: studentCards,
		timeline
	};
};
