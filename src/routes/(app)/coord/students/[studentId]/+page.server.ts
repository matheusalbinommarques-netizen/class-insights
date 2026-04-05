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
	classes: { name: string } | { name: string }[] | null;
};

type SubjectRow = {
	subject_id: string;
	subjects: { name: string } | { name: string }[] | null;
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

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizePercent(
	rawScore: number | null,
	scoreMin: number,
	scoreMax: number
): number | null {
	if (typeof rawScore !== 'number') return null;
	const range = scoreMax - scoreMin;
	if (range <= 0) return null;
	return ((rawScore - scoreMin) / range) * 100;
}

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

function formatLabel(value: number | null) {
	if (typeof value !== 'number') return '--';

	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	}).format(value / 10);
}

function classifySubjectStatus(studentAverage: number | null, classAverage: number | null) {
	if (typeof studentAverage !== 'number') return 'pending' as const;
	if (studentAverage < 50) return 'critical' as const;
	if (studentAverage < 70) return 'attention' as const;
	if (typeof classAverage === 'number' && studentAverage < classAverage - 10) {
		return 'attention' as const;
	}
	return 'healthy' as const;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const coordUserId = getAuthenticatedUserId(locals);

	if (!coordUserId) {
		throw error(401, 'Voce precisa estar autenticado.');
	}

	const { data: scopeData, error: scopeError } = await locals.supabase.rpc('coord_scope_classes');

	if (scopeError) {
		throw error(500, 'Nao foi possivel carregar o escopo da coordenacao.');
	}

	const scopeClasses = (scopeData ?? []) as ScopeClassRow[];

	const { data: studentData, error: studentError } = await locals.supabase
		.from('students')
		.select('id, name, class_id, classes(name)')
		.eq('id', params.studentId)
		.maybeSingle();

	if (studentError || !studentData) {
		throw error(404, 'Aluno nao encontrado.');
	}

	const student = studentData as StudentRow;

	const scopedClass = scopeClasses.find((item) => item.class_id === student.class_id);

	if (!scopedClass) {
		throw error(404, 'Aluno fora do escopo da coordenacao.');
	}

	const className = Array.isArray(student.classes)
		? (student.classes[0]?.name ?? 'Turma')
		: (student.classes?.name ?? 'Turma');

	const { data: subjectsData, error: subjectsError } = await locals.supabase
		.from('class_subjects')
		.select('subject_id, subjects(name)')
		.eq('class_id', student.class_id);

	if (subjectsError) {
		throw error(500, 'Nao foi possivel carregar as materias da turma.');
	}

	const subjects = (subjectsData ?? []) as SubjectRow[];

	const { data: assessmentsData, error: assessmentsError } = await locals.supabase
		.from('assessments')
		.select('id, title, subject_id, assessment_date')
		.eq('class_id', student.class_id)
		.eq('status', 'published')
		.order('assessment_date', { ascending: false });

	if (assessmentsError) {
		throw error(500, 'Nao foi possivel carregar as publicacoes da turma.');
	}

	const publishedAssessments = (assessmentsData ?? []) as AssessmentRow[];
	const assessmentIds = publishedAssessments.map((item) => item.id);

	let results: ResultRow[] = [];

	if (assessmentIds.length > 0) {
		const { data: resultsData, error: resultsError } = await locals.supabase
			.from('assessment_results')
			.select('assessment_id, student_id, raw_score, score_min, score_max, is_excused')
			.in('assessment_id', assessmentIds);

		if (resultsError) {
			throw error(500, 'Nao foi possivel carregar os resultados publicados.');
		}

		results = (resultsData ?? []) as ResultRow[];
	}

	const studentResults = results.filter((item) => item.student_id === student.id);

	const studentAverage = average(
		studentResults
			.filter((item) => !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number')
	);

	const classAverage = average(
		results
			.filter((item) => !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number')
	);

	const subjectCards = subjects.map((subject) => {
		const subjectName = Array.isArray(subject.subjects)
			? (subject.subjects[0]?.name ?? 'Materia')
			: (subject.subjects?.name ?? 'Materia');

		const relatedAssessments = publishedAssessments.filter(
			(item) => item.subject_id === subject.subject_id
		);
		const relatedAssessmentIds = relatedAssessments.map((item) => item.id);

		const subjectStudentResults = studentResults.filter((item) =>
			relatedAssessmentIds.includes(item.assessment_id)
		);

		const subjectAllResults = results.filter((item) =>
			relatedAssessmentIds.includes(item.assessment_id)
		);

		const studentSubjectAverage = average(
			subjectStudentResults
				.filter((item) => !item.is_excused)
				.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
				.filter((value): value is number => typeof value === 'number')
		);

		const classSubjectAverage = average(
			subjectAllResults
				.filter((item) => !item.is_excused)
				.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
				.filter((value): value is number => typeof value === 'number')
		);

		const latestAssessment = relatedAssessments
			.slice()
			.sort((left, right) => right.assessment_date.localeCompare(left.assessment_date))[0];

		const gap =
			typeof studentSubjectAverage === 'number' && typeof classSubjectAverage === 'number'
				? studentSubjectAverage - classSubjectAverage
				: null;

		return {
			subjectId: subject.subject_id,
			subjectName,
			studentAverage: studentSubjectAverage,
			studentAverageLabel: formatLabel(studentSubjectAverage),
			classAverage: classSubjectAverage,
			classAverageLabel: formatLabel(classSubjectAverage),
			gap,
			gapLabel:
				typeof gap === 'number'
					? new Intl.NumberFormat('pt-BR', {
							minimumFractionDigits: 1,
							maximumFractionDigits: 1,
							signDisplay: 'always'
						}).format(gap / 10)
					: '--',
			assessmentsCount: relatedAssessments.length,
			status: classifySubjectStatus(studentSubjectAverage, classSubjectAverage),
			latestAssessmentTitle: latestAssessment?.title ?? null,
			latestAssessmentDate: latestAssessment?.assessment_date ?? null
		};
	});

	const latestPublications = publishedAssessments.slice(0, 8).map((assessment) => {
		const studentAssessmentResult = studentResults.find(
			(item) => item.assessment_id === assessment.id
		);

		const classAssessmentResults = results.filter((item) => item.assessment_id === assessment.id);

		const studentScore = studentAssessmentResult
			? normalizePercent(
					studentAssessmentResult.raw_score,
					studentAssessmentResult.score_min,
					studentAssessmentResult.score_max
				)
			: null;

		const classScore = average(
			classAssessmentResults
				.filter((item) => !item.is_excused)
				.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
				.filter((value): value is number => typeof value === 'number')
		);

		return {
			assessmentId: assessment.id,
			title: assessment.title,
			assessmentDate: assessment.assessment_date,
			studentScore,
			studentScoreLabel: formatLabel(studentScore),
			classScore,
			classScoreLabel: formatLabel(classScore)
		};
	});

	return {
		student: {
			id: student.id,
			name: student.name,
			classId: student.class_id,
			className,
			teacherName: scopedClass.teacher_name,
			exportHref: `/coord/students/${student.id}/export`
		},
		summary: {
			studentAverage,
			studentAverageLabel: formatLabel(studentAverage),
			classAverage,
			classAverageLabel: formatLabel(classAverage),
			publishedAssessments: unique(studentResults.map((item) => item.assessment_id)).length,
			subjectsCount: subjectCards.length,
			gap:
				typeof studentAverage === 'number' && typeof classAverage === 'number'
					? studentAverage - classAverage
					: null,
			gapLabel:
				typeof studentAverage === 'number' && typeof classAverage === 'number'
					? new Intl.NumberFormat('pt-BR', {
							minimumFractionDigits: 1,
							maximumFractionDigits: 1,
							signDisplay: 'always'
						}).format((studentAverage - classAverage) / 10)
					: '--'
		},
		subjects: subjectCards.sort((left, right) => {
			const leftValue = typeof left.studentAverage === 'number' ? left.studentAverage : 999;
			const rightValue = typeof right.studentAverage === 'number' ? right.studentAverage : 999;
			return leftValue - rightValue;
		}),
		latestPublications
	};
};
