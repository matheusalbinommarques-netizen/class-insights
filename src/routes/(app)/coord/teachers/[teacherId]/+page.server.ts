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
	class_id: string;
	class_name: string;
};

type AssessmentRow = {
	id: string;
	class_id: string;
	assessment_date: string;
	title: string;
};

type ResultRow = {
	assessment_id: string;
	student_id: string;
	raw_score: number | null;
	score_min: number;
	score_max: number;
	is_excused: boolean;
};

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

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
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
	const teacherClasses = scopeClasses.filter((item) => item.teacher_id === params.teacherId);

	if (teacherClasses.length === 0) {
		throw error(404, 'Professor nao encontrado no escopo da coordenacao.');
	}

	const classIds = teacherClasses.map((item) => item.class_id);

	const { data: studentsData, error: studentsError } = await locals.supabase
		.from('students')
		.select('id, name, class_id, classes(name)')
		.in('class_id', classIds);

	if (studentsError) {
		throw error(500, 'Nao foi possivel carregar os alunos desse professor.');
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

	const { data: assessmentsData, error: assessmentsError } = await locals.supabase
		.from('assessments')
		.select('id, class_id, assessment_date, title, status')
		.in('class_id', classIds)
		.eq('status', 'published')
		.order('assessment_date', { ascending: true });

	if (assessmentsError) {
		throw error(500, 'Nao foi possivel carregar as publicacoes do professor.');
	}

	const publishedAssessments = (
		(assessmentsData ?? []) as Array<{
			id: string;
			class_id: string;
			assessment_date: string;
			title: string;
			status: 'draft' | 'published';
		}>
	).map<AssessmentRow>((row) => ({
		id: row.id,
		class_id: row.class_id,
		assessment_date: row.assessment_date,
		title: row.title
	}));

	const assessmentIds = publishedAssessments.map((item) => item.id);

	let results: ResultRow[] = [];

	if (assessmentIds.length > 0) {
		const { data: resultsData, error: resultsError } = await locals.supabase
			.from('assessment_results')
			.select('assessment_id, student_id, raw_score, score_min, score_max, is_excused')
			.in('assessment_id', assessmentIds);

		if (resultsError) {
			throw error(500, 'Nao foi possivel carregar os resultados publicados do professor.');
		}

		results = (resultsData ?? []) as ResultRow[];
	}

	const classes = teacherClasses.map((classRow) => {
		const classStudents = students.filter((item) => item.class_id === classRow.class_id);
		const classAssessmentIds = publishedAssessments
			.filter((item) => item.class_id === classRow.class_id)
			.map((item) => item.id);

		const classResults = results.filter((item) => classAssessmentIds.includes(item.assessment_id));
		const normalized = classResults
			.filter((item) => !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		const averagePercent = average(normalized);
		const studentsAtRisk = classStudents.filter((student) => {
			const studentScores = classResults
				.filter((item) => item.student_id === student.id && !item.is_excused)
				.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
				.filter((value): value is number => typeof value === 'number');

			const studentAverage = average(studentScores);
			return typeof studentAverage === 'number' && studentAverage < 60;
		}).length;

		return {
			classId: classRow.class_id,
			className: classRow.class_name,
			accessCode: classRow.access_code,
			averagePercent,
			averageLabel: formatLabel(averagePercent),
			publishedAssessments: classAssessmentIds.length,
			studentsCount: classStudents.length,
			studentsAtRisk,
			detailHref: `/coord/classes/${classRow.class_id}`
		};
	});

	const studentsPriority = students
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
				status: classifyStudentStatus(averagePercent),
				detailHref: `/coord/students/${student.id}`
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null)
		.sort((left, right) => left.averagePercent - right.averagePercent);

	const normalizedResults = results
		.filter((item) => !item.is_excused)
		.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
		.filter((value): value is number => typeof value === 'number');

	const averagePercent = average(normalizedResults);
	const totalStudents = students.length;
	const studentsAtRisk = studentsPriority.filter((item) => item.averagePercent < 60).length;

	return {
		teacher: {
			id: teacherClasses[0].teacher_id,
			name: teacherClasses[0].teacher_name
		},
		summary: {
			totalClasses: teacherClasses.length,
			totalStudents,
			publishedAssessments: publishedAssessments.length,
			averagePercent,
			averageLabel: formatLabel(averagePercent),
			studentsAtRisk
		},
		classes,
		students: studentsPriority.slice(0, 8)
	};
};
