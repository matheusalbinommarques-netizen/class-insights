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

type StudentRow = {
	id: string;
	name: string;
};

type SubjectRow = {
	subject_id: string;
	subject_name: string;
};

type AssessmentRow = {
	id: string;
	title: string;
	subject_id: string;
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

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function classifyStudentStatus(value: number | null) {
	if (typeof value !== 'number') return 'pending' as const;
	if (value < 50) return 'critical' as const;
	if (value < 70) return 'attention' as const;
	return 'healthy' as const;
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
	const targetClass = scopeClasses.find((item) => item.class_id === params.classId);

	if (!targetClass) {
		throw error(404, 'Turma nao encontrada no escopo da coordenacao.');
	}

	const { data: studentsData, error: studentsError } = await locals.supabase
		.from('students')
		.select('id, name')
		.eq('class_id', params.classId)
		.order('name', { ascending: true });

	if (studentsError) {
		throw error(500, 'Nao foi possivel carregar os alunos da turma.');
	}

	const students = (studentsData ?? []) as StudentRow[];

	const { data: subjectsData, error: subjectsError } = await locals.supabase
		.from('class_subjects')
		.select('subject_id, subjects(name)')
		.eq('class_id', params.classId);

	if (subjectsError) {
		throw error(500, 'Nao foi possivel carregar as materias da turma.');
	}

	const subjects = (
		(subjectsData ?? []) as Array<{
			subject_id: string;
			subjects: { name: string } | { name: string }[] | null;
		}>
	).map<SubjectRow>((row) => ({
		subject_id: row.subject_id,
		subject_name: Array.isArray(row.subjects)
			? (row.subjects[0]?.name ?? 'Materia')
			: (row.subjects?.name ?? 'Materia')
	}));

	const { data: assessmentsData, error: assessmentsError } = await locals.supabase
		.from('assessments')
		.select('id, title, subject_id, assessment_date, status')
		.eq('class_id', params.classId)
		.eq('status', 'published')
		.order('assessment_date', { ascending: true });

	if (assessmentsError) {
		throw error(500, 'Nao foi possivel carregar as publicacoes da turma.');
	}

	const publishedAssessments = (
		(assessmentsData ?? []) as Array<{
			id: string;
			title: string;
			subject_id: string;
			assessment_date: string;
			status: 'draft' | 'published';
		}>
	).map<AssessmentRow>((row) => ({
		id: row.id,
		title: row.title,
		subject_id: row.subject_id,
		assessment_date: row.assessment_date
	}));

	const assessmentIds = publishedAssessments.map((item) => item.id);

	let results: ResultRow[] = [];

	if (assessmentIds.length > 0) {
		const { data: resultsData, error: resultsError } = await locals.supabase
			.from('assessment_results')
			.select('assessment_id, student_id, raw_score, score_min, score_max, is_excused')
			.in('assessment_id', assessmentIds);

		if (resultsError) {
			throw error(500, 'Nao foi possivel carregar os resultados publicados da turma.');
		}

		results = (resultsData ?? []) as ResultRow[];
	}

	const totalExpectedResults = students.length * Math.max(publishedAssessments.length, 1);
	const coveragePercent =
		totalExpectedResults > 0 ? Math.round((results.length / totalExpectedResults) * 100) : 0;

	const normalizedResults = results
		.filter((item) => !item.is_excused)
		.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
		.filter((value): value is number => typeof value === 'number');

	const classAverage = average(normalizedResults);
	const studentsAtRisk = students.filter((student) => {
		const studentScores = results
			.filter((item) => item.student_id === student.id && !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		const studentAverage = average(studentScores);
		return typeof studentAverage === 'number' && studentAverage < 60;
	}).length;

	const subjectNameById = new Map(subjects.map((item) => [item.subject_id, item.subject_name]));

	const subjectCards = subjects.map((subject) => {
		const relatedAssessments = publishedAssessments.filter(
			(item) => item.subject_id === subject.subject_id
		);
		const relatedAssessmentIds = relatedAssessments.map((item) => item.id);
		const relatedResults = results.filter((item) =>
			relatedAssessmentIds.includes(item.assessment_id)
		);

		const normalized = relatedResults
			.filter((item) => !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		const averagePercent = average(normalized);

		const trendSeries = relatedAssessments.map((assessment) => {
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

		return {
			subjectId: subject.subject_id,
			subjectName: subject.subject_name,
			averagePercent,
			averageLabel: formatLabel(averagePercent),
			assessmentsCount: relatedAssessments.length,
			recentTrend
		};
	});

	const studentCards = students.map((student) => {
		const studentResults = results.filter((item) => item.student_id === student.id);
		const normalized = studentResults
			.filter((item) => !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		const averagePercent = average(normalized);

		const latestAssessment = [...publishedAssessments]
			.filter((assessment) => studentResults.some((item) => item.assessment_id === assessment.id))
			.sort((left, right) => right.assessment_date.localeCompare(left.assessment_date))[0];

		return {
			studentId: student.id,
			studentName: student.name,
			averagePercent,
			averageLabel: formatLabel(averagePercent),
			publishedAssessments: unique(studentResults.map((item) => item.assessment_id)).length,
			status: classifyStudentStatus(averagePercent),
			latestAssessmentTitle: latestAssessment?.title ?? null,
			latestAssessmentDate: latestAssessment?.assessment_date ?? null,
			detailHref: `/coord/students/${student.id}`
		};
	});

	return {
		classroom: {
			id: targetClass.class_id,
			name: targetClass.class_name,
			teacherId: targetClass.teacher_id,
			teacherName: targetClass.teacher_name,
			accessCode: targetClass.access_code
		},
		summary: {
			studentsCount: students.length,
			publishedAssessments: publishedAssessments.length,
			averagePercent: classAverage,
			averageLabel: formatLabel(classAverage),
			coveragePercent,
			studentsAtRisk
		},
		subjects: subjectCards,
		students: studentCards,
		timeline: publishedAssessments.map((assessment) => ({
			assessmentId: assessment.id,
			assessmentTitle: assessment.title,
			assessmentDate: assessment.assessment_date,
			subjectName: subjectNameById.get(assessment.subject_id) ?? 'Materia'
		}))
	};
};
