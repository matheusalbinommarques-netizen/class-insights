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

type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';
type ClassStatus = 'healthy' | 'attention' | 'critical' | 'pending';
type StudentStatus = 'healthy' | 'attention' | 'critical' | 'pending';
type SubjectProblemType =
	| 'low_average'
	| 'recent_decline'
	| 'little_base'
	| 'concentrated_risk'
	| 'stable';

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

function formatLabel(value: number | null): string {
	if (typeof value !== 'number') return '--';

	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	}).format(value / 10);
}

function formatPercentLabel(value: number | null): string {
	if (typeof value !== 'number') return '--';

	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(value);
}

function classifyTrend(
	series: Array<{ assessmentDate: string; averagePercent: number | null }>
): Trend {
	const valid = series
		.filter((item) => typeof item.averagePercent === 'number')
		.sort((left, right) => left.assessmentDate.localeCompare(right.assessmentDate));

	if (valid.length < 2) return 'insufficient_data';

	const midpoint = Math.floor(valid.length / 2);
	const firstHalf = valid.slice(0, midpoint);
	const secondHalf = valid.slice(midpoint);

	const start = average(firstHalf.map((item) => item.averagePercent ?? 0));
	const end = average(secondHalf.map((item) => item.averagePercent ?? 0));

	if (typeof start !== 'number' || typeof end !== 'number') {
		return 'insufficient_data';
	}

	const delta = end - start;

	if (delta >= 5) return 'improving';
	if (delta <= -5) return 'declining';
	return 'stable';
}

function classifyClassStatus(value: number | null): ClassStatus {
	if (typeof value !== 'number') return 'pending';
	if (value < 50) return 'critical';
	if (value < 70) return 'attention';
	return 'healthy';
}

function classifyStudentStatus(value: number | null): StudentStatus {
	if (typeof value !== 'number') return 'pending';
	if (value < 50) return 'critical';
	if (value < 70) return 'attention';
	return 'healthy';
}

function trendLabel(trend: Trend): string {
	if (trend === 'declining') return 'Em queda';
	if (trend === 'improving') return 'Em melhora';
	if (trend === 'stable') return 'Estável';
	return 'Base insuficiente';
}

function scoreClassPriority(input: {
	averagePercent: number | null;
	studentsAtRisk: number;
	assessmentsCount: number;
	coveragePercent: number;
}): number {
	const riskBase =
		typeof input.averagePercent !== 'number'
			? 60
			: input.averagePercent < 50
				? 220
				: input.averagePercent < 70
					? 140
					: 70;

	return (
		riskBase +
		input.studentsAtRisk * 22 +
		Math.round((100 - (input.averagePercent ?? 100)) * 1.4) +
		input.assessmentsCount * 4 +
		Math.round((100 - input.coveragePercent) * 0.5)
	);
}

function scoreStudentPriority(input: {
	averagePercent: number | null;
	publishedAssessments: number;
	status: StudentStatus;
}): number {
	const statusScore =
		input.status === 'critical'
			? 240
			: input.status === 'attention'
				? 150
				: input.status === 'healthy'
					? 70
					: 20;

	return (
		statusScore +
		Math.round((100 - (input.averagePercent ?? 100)) * 2) +
		input.publishedAssessments * 4
	);
}

function classifySubjectProblem(input: {
	averagePercent: number | null;
	recentTrend: Trend;
	publishedAssessments: number;
	normalizedScoresCount: number;
	coveragePercent: number;
	studentsAtRisk: number;
	classesWithRisk: number;
	totalClasses: number;
}): {
	type: SubjectProblemType;
	label: string;
	reason: string;
} {
	const littleBase =
		input.publishedAssessments < 2 ||
		input.normalizedScoresCount < 8 ||
		input.coveragePercent < 35 ||
		input.recentTrend === 'insufficient_data';

	if (littleBase) {
		return {
			type: 'little_base',
			label: 'Pouca base',
			reason:
				'A matéria ainda possui pouca base publicada para uma leitura institucional mais firme.'
		};
	}

	if (input.recentTrend === 'declining') {
		return {
			type: 'recent_decline',
			label: 'Queda recente',
			reason: 'A matéria mostra queda recente nas publicações disponíveis do escopo.'
		};
	}

	if (typeof input.averagePercent === 'number' && input.averagePercent < 60) {
		return {
			type: 'low_average',
			label: 'Média baixa',
			reason: 'A média publicada da matéria está abaixo da faixa esperada no recorte.'
		};
	}

	const concentratedRisk =
		input.studentsAtRisk >= 3 &&
		(input.classesWithRisk <= Math.max(1, Math.floor(input.totalClasses / 2)) ||
			(input.totalClasses <= 2 && input.classesWithRisk === 1));

	if (concentratedRisk) {
		return {
			type: 'concentrated_risk',
			label: 'Concentração de risco',
			reason:
				'O risco da matéria aparece concentrado em poucas turmas ou em um grupo mais específico de alunos.'
		};
	}

	return {
		type: 'stable',
		label: 'Leitura estável',
		reason: 'A matéria está dentro do esperado no escopo atual.'
	};
}

function buildClassReason(input: {
	averagePercent: number | null;
	studentsAtRisk: number;
	assessmentsCount: number;
	coveragePercent: number;
}): string {
	if (input.assessmentsCount === 0 || input.coveragePercent < 20) {
		return 'A turma ainda tem pouca base publicada desta matéria para comparação.';
	}

	if (typeof input.averagePercent === 'number' && input.averagePercent < 50) {
		return 'A matéria está com média crítica nesta turma.';
	}

	if (typeof input.averagePercent === 'number' && input.averagePercent < 70) {
		return 'A matéria pede atenção nesta turma pelo desempenho publicado.';
	}

	if (input.studentsAtRisk >= 3) {
		return `A turma concentra ${input.studentsAtRisk} aluno(s) em atenção nesta matéria.`;
	}

	if (input.studentsAtRisk > 0) {
		return `Há ${input.studentsAtRisk} aluno(s) em atenção nesta matéria na turma.`;
	}

	return 'A turma está dentro do esperado para esta matéria.';
}

function buildStudentReason(input: {
	averagePercent: number | null;
	status: StudentStatus;
	publishedAssessments: number;
	className: string;
}): string {
	if (input.publishedAssessments === 0) {
		return `Ainda não há base publicada suficiente para este aluno em ${input.className}.`;
	}

	if (input.status === 'critical') {
		return `O aluno aparece com desempenho crítico nesta matéria em ${input.className}.`;
	}

	if (input.status === 'attention') {
		return `O aluno aparece em atenção nesta matéria em ${input.className}.`;
	}

	return `O aluno está dentro do esperado nesta matéria em ${input.className}.`;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const coordId = getAuthenticatedUserId(locals);

	if (!coordId) {
		throw error(401, 'Você precisa estar autenticado.');
	}

	const { data: scopeData, error: scopeError } = await locals.supabase.rpc('coord_scope_classes');

	if (scopeError) {
		throw error(500, 'Não foi possível carregar o escopo da coordenação.');
	}

	const scopeClasses = (scopeData ?? []) as ScopeClassRow[];
	const classIds = scopeClasses.map((item) => item.class_id);

	if (classIds.length === 0) {
		throw error(404, 'Nenhuma turma encontrada no escopo da coordenação.');
	}

	const { data: subjectLinksData, error: subjectLinksError } = await locals.supabase
		.from('class_subjects')
		.select('class_id, subject_id, subjects(name)')
		.eq('subject_id', params.subjectId)
		.in('class_id', classIds);

	if (subjectLinksError) {
		throw error(500, 'Não foi possível carregar a matéria no escopo da coordenação.');
	}

	const subjectLinks = (subjectLinksData ?? []) as Array<{
		class_id: string;
		subject_id: string;
		subjects: { name: string } | { name: string }[] | null;
	}>;

	if (subjectLinks.length === 0) {
		throw error(404, 'Matéria não encontrada no escopo da coordenação.');
	}

	const subjectName = Array.isArray(subjectLinks[0]?.subjects)
		? (subjectLinks[0]?.subjects[0]?.name ?? 'Matéria')
		: (subjectLinks[0]?.subjects?.name ?? 'Matéria');

	const scopedClassIdsForSubject = unique(subjectLinks.map((item) => item.class_id));

	const { data: assessmentsData, error: assessmentsError } = await locals.supabase
		.from('assessments')
		.select('id, title, class_id, assessment_date')
		.eq('subject_id', params.subjectId)
		.eq('status', 'published')
		.in('class_id', scopedClassIdsForSubject)
		.order('assessment_date', { ascending: true });

	if (assessmentsError) {
		throw error(500, 'Não foi possível carregar as publicações da matéria.');
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
			throw error(500, 'Não foi possível carregar os resultados da matéria.');
		}

		results = (resultsData ?? []) as ResultRow[];
	}

	const { data: studentsData, error: studentsError } = await locals.supabase
		.from('students')
		.select('id, name, class_id, classes(name)')
		.in('class_id', scopedClassIdsForSubject);

	if (studentsError) {
		throw error(500, 'Não foi possível carregar os alunos do escopo da matéria.');
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
	const studentsByClassId = new Map<string, StudentRow[]>();
	const resultsByAssessmentId = new Map<string, ResultRow[]>();

	for (const student of students) {
		const bucket = studentsByClassId.get(student.class_id) ?? [];
		bucket.push(student);
		studentsByClassId.set(student.class_id, bucket);
	}

	for (const result of results) {
		const bucket = resultsByAssessmentId.get(result.assessment_id) ?? [];
		bucket.push(result);
		resultsByAssessmentId.set(result.assessment_id, bucket);
	}

	const normalizedResults = results
		.filter((item) => !item.is_excused)
		.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
		.filter((value): value is number => typeof value === 'number');

	const subjectAverage = average(normalizedResults);

	const trendSeries = assessments.map((assessment) => {
		const perAssessmentScores = (resultsByAssessmentId.get(assessment.id) ?? [])
			.filter((item) => !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		return {
			assessmentDate: assessment.assessment_date,
			averagePercent: average(perAssessmentScores)
		};
	});

	const recentTrend = classifyTrend(trendSeries);

	const totalExpectedResults = assessments.reduce((sum, assessment) => {
		const classStudents = studentsByClassId.get(assessment.class_id) ?? [];
		return sum + classStudents.length;
	}, 0);

	const coveragePercent =
		totalExpectedResults > 0 ? Math.round((results.length / totalExpectedResults) * 100) : 0;

	const classCards = scopedClassIdsForSubject
		.map((classId) => {
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

			const atRiskStudentIds = unique(
				relatedResults
					.filter((item) => !item.is_excused)
					.filter((item) => {
						const normalizedValue = normalizePercent(
							item.raw_score,
							item.score_min,
							item.score_max
						);
						return typeof normalizedValue === 'number' && normalizedValue < 60;
					})
					.map((item) => item.student_id)
			);

			const classStudents = studentsByClassId.get(classId) ?? [];
			const expectedResults = relatedAssessments.reduce((sum) => sum + classStudents.length, 0);
			const classCoveragePercent =
				expectedResults > 0 ? Math.round((relatedResults.length / expectedResults) * 100) : 0;

			const classroom = classById.get(classId);

			return {
				classId,
				className: classroom?.class_name ?? 'Turma',
				teacherName: classroom?.teacher_name ?? 'Professor',
				averagePercent,
				averageLabel: formatLabel(averagePercent),
				averagePercentLabel: formatPercentLabel(averagePercent),
				assessmentsCount: relatedAssessments.length,
				studentsAtRisk: atRiskStudentIds.length,
				status: classifyClassStatus(averagePercent),
				coveragePercent: classCoveragePercent,
				primaryReason: buildClassReason({
					averagePercent,
					studentsAtRisk: atRiskStudentIds.length,
					assessmentsCount: relatedAssessments.length,
					coveragePercent: classCoveragePercent
				}),
				priorityScore: scoreClassPriority({
					averagePercent,
					studentsAtRisk: atRiskStudentIds.length,
					assessmentsCount: relatedAssessments.length,
					coveragePercent: classCoveragePercent
				}),
				detailHref: `/coord/classes/${classId}`
			};
		})
		.sort((left, right) => {
			if (right.priorityScore !== left.priorityScore) {
				return right.priorityScore - left.priorityScore;
			}

			return (left.averagePercent ?? 999) - (right.averagePercent ?? 999);
		});

	const studentCards = students
		.map((student) => {
			const studentResults = results.filter((item) => item.student_id === student.id);

			const normalized = studentResults
				.filter((item) => !item.is_excused)
				.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
				.filter((value): value is number => typeof value === 'number');

			const averagePercent = average(normalized);
			const status = classifyStudentStatus(averagePercent);
			const publishedAssessments = unique(studentResults.map((item) => item.assessment_id)).length;

			if (typeof averagePercent !== 'number' && publishedAssessments === 0) {
				return null;
			}

			return {
				studentId: student.id,
				studentName: student.name,
				className: student.class_name,
				averagePercent,
				averageLabel: formatLabel(averagePercent),
				averagePercentLabel: formatPercentLabel(averagePercent),
				publishedAssessments,
				status,
				primaryReason: buildStudentReason({
					averagePercent,
					status,
					publishedAssessments,
					className: student.class_name
				}),
				priorityScore: scoreStudentPriority({
					averagePercent,
					publishedAssessments,
					status
				}),
				detailHref: `/coord/students/${student.id}`
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null)
		.sort((left, right) => {
			if (right.priorityScore !== left.priorityScore) {
				return right.priorityScore - left.priorityScore;
			}

			return (left.averagePercent ?? 999) - (right.averagePercent ?? 999);
		});

	const classesWithRisk = classCards.filter((item) => item.studentsAtRisk > 0).length;
	const studentsAtRisk = studentCards.filter(
		(item) => item.status === 'critical' || item.status === 'attention'
	).length;

	const diagnosis = classifySubjectProblem({
		averagePercent: subjectAverage,
		recentTrend,
		publishedAssessments: assessments.length,
		normalizedScoresCount: normalizedResults.length,
		coveragePercent,
		studentsAtRisk,
		classesWithRisk,
		totalClasses: scopedClassIdsForSubject.length
	});

	const timeline = assessments.map((assessment) => {
		const relatedResults = (resultsByAssessmentId.get(assessment.id) ?? []).filter(
			(item) => !item.is_excused
		);

		const normalized = relatedResults
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		return {
			assessmentId: assessment.id,
			assessmentTitle: assessment.title,
			assessmentDate: assessment.assessment_date,
			className: classById.get(assessment.class_id)?.class_name ?? 'Turma',
			averageLabel: formatLabel(average(normalized)),
			averagePercentLabel: formatPercentLabel(average(normalized))
		};
	});

	const mostCriticalClass = classCards[0] ?? null;
	const priorityStudents = studentCards.slice(0, 5);

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
			averagePercentLabel: formatPercentLabel(subjectAverage),
			recentTrend,
			recentTrendLabel: trendLabel(recentTrend),
			coveragePercent,
			studentsAtRisk,
			classesWithRisk,
			problemType: diagnosis.type,
			problemLabel: diagnosis.label,
			problemReason: diagnosis.reason
		},
		institutionalFocus: {
			problemType: diagnosis.type,
			problemLabel: diagnosis.label,
			problemReason: diagnosis.reason,
			mostCriticalClass,
			priorityStudents,
			recentTrend,
			recentTrendLabel: trendLabel(recentTrend)
		},
		classes: classCards,
		students: studentCards,
		timeline
	};
};
