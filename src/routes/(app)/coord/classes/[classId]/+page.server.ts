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

type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';
type StudentStatus = 'healthy' | 'attention' | 'critical' | 'pending';

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

function formatTenPointLabel(value: number | null): string {
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

function classifyStudentStatus(value: number | null): StudentStatus {
	if (typeof value !== 'number') return 'pending';
	if (value < 50) return 'critical';
	if (value < 70) return 'attention';
	return 'healthy';
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

function trendSummaryLabel(trend: Trend): string {
	if (trend === 'declining') return 'Em queda';
	if (trend === 'improving') return 'Em melhora';
	if (trend === 'stable') return 'Estável';
	return 'Base insuficiente';
}

function buildSubjectReason(input: {
	assessmentsCount: number;
	averagePercent: number | null;
	recentTrend: Trend;
	studentsAtRisk: number;
}): string {
	if (input.assessmentsCount === 0) {
		return 'A matéria ainda não possui publicações suficientes para leitura institucional.';
	}

	if (input.recentTrend === 'declining') {
		return 'A matéria apresenta tendência recente de queda na turma.';
	}

	if (typeof input.averagePercent === 'number' && input.averagePercent < 60) {
		return 'A média publicada da matéria está abaixo do esperado.';
	}

	if (input.studentsAtRisk > 0) {
		return `${input.studentsAtRisk} aluno(s) aparecem abaixo da faixa esperada nesta matéria.`;
	}

	if (input.recentTrend === 'improving') {
		return 'A matéria mostra melhora recente nesta turma.';
	}

	return 'A matéria está estável no recorte atual.';
}

function buildClassReason(input: {
	publishedAssessments: number;
	averagePercent: number | null;
	studentsAtRisk: number;
	classTrend: Trend;
}): string {
	if (input.publishedAssessments === 0) {
		return 'A turma ainda não possui publicações suficientes para leitura institucional.';
	}

	if (input.classTrend === 'declining') {
		return 'A turma mostra tendência recente de queda nas publicações disponíveis.';
	}

	if (typeof input.averagePercent === 'number' && input.averagePercent < 60) {
		return 'A média publicada da turma está abaixo do esperado.';
	}

	if (input.studentsAtRisk > 0) {
		return `${input.studentsAtRisk} aluno(s) aparecem em atenção neste recorte.`;
	}

	return 'A turma está dentro do esperado neste momento.';
}

function scoreSubjectPriority(input: {
	averagePercent: number | null;
	recentTrend: Trend;
	studentsAtRisk: number;
	assessmentsCount: number;
}): number {
	const trendScore =
		input.recentTrend === 'declining'
			? 150
			: input.recentTrend === 'stable'
				? 40
				: input.recentTrend === 'improving'
					? 10
					: 20;

	return (
		trendScore +
		Math.round((100 - (input.averagePercent ?? 100)) * 1.5) +
		input.studentsAtRisk * 20 +
		input.assessmentsCount * 2
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
					? 60
					: 20;

	return (
		statusScore +
		Math.round((100 - (input.averagePercent ?? 100)) * 2) +
		input.publishedAssessments * 4
	);
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
	const targetClass = scopeClasses.find((item) => item.class_id === params.classId);

	if (!targetClass) {
		throw error(404, 'Turma não encontrada no escopo da coordenação.');
	}

	const { data: studentsData, error: studentsError } = await locals.supabase
		.from('students')
		.select('id, name')
		.eq('class_id', params.classId)
		.order('name', { ascending: true });

	if (studentsError) {
		throw error(500, 'Não foi possível carregar os alunos da turma.');
	}

	const students = (studentsData ?? []) as StudentRow[];

	const { data: subjectsData, error: subjectsError } = await locals.supabase
		.from('class_subjects')
		.select('subject_id, subjects(name)')
		.eq('class_id', params.classId);

	if (subjectsError) {
		throw error(500, 'Não foi possível carregar as matérias da turma.');
	}

	const subjects = (
		(subjectsData ?? []) as Array<{
			subject_id: string;
			subjects: { name: string } | { name: string }[] | null;
		}>
	).map<SubjectRow>((row) => ({
		subject_id: row.subject_id,
		subject_name: Array.isArray(row.subjects)
			? (row.subjects[0]?.name ?? 'Matéria')
			: (row.subjects?.name ?? 'Matéria')
	}));

	const { data: assessmentsData, error: assessmentsError } = await locals.supabase
		.from('assessments')
		.select('id, title, subject_id, assessment_date, status')
		.eq('class_id', params.classId)
		.eq('status', 'published')
		.order('assessment_date', { ascending: true });

	if (assessmentsError) {
		throw error(500, 'Não foi possível carregar as publicações da turma.');
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
			throw error(500, 'Não foi possível carregar os resultados publicados da turma.');
		}

		results = (resultsData ?? []) as ResultRow[];
	}

	const subjectNameById = new Map(subjects.map((item) => [item.subject_id, item.subject_name]));

	const resultsByAssessmentId = new Map<string, ResultRow[]>();
	for (const result of results) {
		const bucket = resultsByAssessmentId.get(result.assessment_id) ?? [];
		bucket.push(result);
		resultsByAssessmentId.set(result.assessment_id, bucket);
	}

	const studentAverageById = new Map<string, number | null>();
	for (const student of students) {
		const normalized = results
			.filter((item) => item.student_id === student.id && !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		studentAverageById.set(student.id, average(normalized));
	}

	const totalExpectedResults = publishedAssessments.length * Math.max(students.length, 1);
	const coveragePercent =
		totalExpectedResults > 0 ? Math.round((results.length / totalExpectedResults) * 100) : 0;

	const normalizedResults = results
		.filter((item) => !item.is_excused)
		.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
		.filter((value): value is number => typeof value === 'number');

	const classAverage = average(normalizedResults);

	const assessmentTrendSeries = publishedAssessments.map((assessment) => {
		const perAssessmentScores = (resultsByAssessmentId.get(assessment.id) ?? [])
			.filter((item) => !item.is_excused)
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		return {
			assessmentDate: assessment.assessment_date,
			averagePercent: average(perAssessmentScores)
		};
	});

	const classTrend = classifyTrend(assessmentTrendSeries);
	const latestPublicationDate =
		[...publishedAssessments]
			.map((item) => item.assessment_date)
			.sort((left, right) => right.localeCompare(left))[0] ?? null;

	const studentsAtRisk = [...studentAverageById.values()].filter(
		(value) => typeof value === 'number' && value < 60
	).length;

	const subjectCards = subjects
		.map((subject) => {
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

			const studentsAtRiskInSubject = students.filter((student) => {
				const studentScores = relatedResults
					.filter((item) => item.student_id === student.id && !item.is_excused)
					.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
					.filter((value): value is number => typeof value === 'number');

				const studentAverage = average(studentScores);
				return typeof studentAverage === 'number' && studentAverage < 60;
			}).length;

			const priorityScore = scoreSubjectPriority({
				averagePercent,
				recentTrend,
				studentsAtRisk: studentsAtRiskInSubject,
				assessmentsCount: relatedAssessments.length
			});

			return {
				subjectId: subject.subject_id,
				subjectName: subject.subject_name,
				averagePercent,
				averageLabel: formatTenPointLabel(averagePercent),
				averagePercentLabel: formatPercentLabel(averagePercent),
				assessmentsCount: relatedAssessments.length,
				recentTrend,
				studentsAtRisk: studentsAtRiskInSubject,
				priorityScore,
				primaryReason: buildSubjectReason({
					assessmentsCount: relatedAssessments.length,
					averagePercent,
					recentTrend,
					studentsAtRisk: studentsAtRiskInSubject
				}),
				detailHref: `/coord/subjects/${subject.subject_id}`
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

			const latestAssessment = [...publishedAssessments]
				.filter((assessment) => studentResults.some((item) => item.assessment_id === assessment.id))
				.sort((left, right) => right.assessment_date.localeCompare(left.assessment_date))[0];

			const publishedAssessmentsCount = unique(
				studentResults.map((item) => item.assessment_id)
			).length;

			const trendSeries = publishedAssessments
				.filter((assessment) => studentResults.some((item) => item.assessment_id === assessment.id))
				.map((assessment) => {
					const perAssessmentScores = studentResults
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
				studentId: student.id,
				studentName: student.name,
				averagePercent,
				averageLabel: formatTenPointLabel(averagePercent),
				averagePercentLabel: formatPercentLabel(averagePercent),
				publishedAssessments: publishedAssessmentsCount,
				status,
				recentTrend,
				latestAssessmentTitle: latestAssessment?.title ?? null,
				latestAssessmentDate: latestAssessment?.assessment_date ?? null,
				priorityScore: scoreStudentPriority({
					averagePercent,
					publishedAssessments: publishedAssessmentsCount,
					status
				}),
				detailHref: `/coord/students/${student.id}`
			};
		})
		.sort((left, right) => {
			if (right.priorityScore !== left.priorityScore) {
				return right.priorityScore - left.priorityScore;
			}

			return (left.averagePercent ?? 999) - (right.averagePercent ?? 999);
		});

	const criticalSubject = subjectCards[0] ?? null;
	const attentionStudents = studentCards.filter(
		(student) => student.status === 'critical' || student.status === 'attention'
	);

	const timeline = publishedAssessments.map((assessment) => {
		const assessmentResults = (resultsByAssessmentId.get(assessment.id) ?? []).filter(
			(item) => !item.is_excused
		);

		const normalized = assessmentResults
			.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
			.filter((value): value is number => typeof value === 'number');

		return {
			assessmentId: assessment.id,
			assessmentTitle: assessment.title,
			assessmentDate: assessment.assessment_date,
			subjectName: subjectNameById.get(assessment.subject_id) ?? 'Matéria',
			averagePercent: average(normalized),
			averagePercentLabel: formatPercentLabel(average(normalized)),
			studentsWithScore: normalized.length
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
			averageLabel: formatTenPointLabel(classAverage),
			averagePercentLabel: formatPercentLabel(classAverage),
			coveragePercent,
			studentsAtRisk,
			classTrend,
			classTrendLabel: trendSummaryLabel(classTrend),
			latestPublicationDate,
			primaryReason: buildClassReason({
				publishedAssessments: publishedAssessments.length,
				averagePercent: classAverage,
				studentsAtRisk,
				classTrend
			})
		},
		institutionalFocus: {
			criticalSubject:
				criticalSubject && criticalSubject.assessmentsCount > 0
					? {
							subjectId: criticalSubject.subjectId,
							subjectName: criticalSubject.subjectName,
							averagePercent: criticalSubject.averagePercent,
							averageLabel: criticalSubject.averageLabel,
							averagePercentLabel: criticalSubject.averagePercentLabel,
							assessmentsCount: criticalSubject.assessmentsCount,
							recentTrend: criticalSubject.recentTrend,
							studentsAtRisk: criticalSubject.studentsAtRisk,
							primaryReason: criticalSubject.primaryReason,
							detailHref: criticalSubject.detailHref
						}
					: null,
			attentionStudents: attentionStudents.slice(0, 5).map((student) => ({
				studentId: student.studentId,
				studentName: student.studentName,
				averagePercent: student.averagePercent,
				averageLabel: student.averageLabel,
				averagePercentLabel: student.averagePercentLabel,
				status: student.status,
				recentTrend: student.recentTrend,
				latestAssessmentTitle: student.latestAssessmentTitle,
				latestAssessmentDate: student.latestAssessmentDate,
				detailHref: student.detailHref
			})),
			classTrend,
			classTrendLabel: trendSummaryLabel(classTrend)
		},
		subjects: subjectCards,
		students: studentCards,
		timeline
	};
};
