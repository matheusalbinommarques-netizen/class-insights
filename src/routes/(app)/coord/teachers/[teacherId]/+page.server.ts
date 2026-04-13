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

type StudentStatus = 'healthy' | 'attention' | 'critical' | 'pending';

type AttentionPatternType =
	| 'little_base'
	| 'broad_risk'
	| 'concentrated_risk'
	| 'low_average'
	| 'stable';

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

function formatPercentLabel(value: number | null) {
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

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

function scoreClassPriority(input: {
	averagePercent: number | null;
	studentsAtRisk: number;
	publishedAssessments: number;
	coveragePercent: number;
}): number {
	const base =
		typeof input.averagePercent !== 'number'
			? 60
			: input.averagePercent < 50
				? 220
				: input.averagePercent < 70
					? 140
					: 70;

	return (
		base +
		input.studentsAtRisk * 20 +
		input.publishedAssessments * 4 +
		Math.round((100 - (input.averagePercent ?? 100)) * 1.3) +
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

function buildClassReason(input: {
	averagePercent: number | null;
	studentsAtRisk: number;
	publishedAssessments: number;
	coveragePercent: number;
}): string {
	if (input.publishedAssessments === 0 || input.coveragePercent < 20) {
		return 'A turma ainda tem pouca base publicada para leitura institucional.';
	}

	if (typeof input.averagePercent === 'number' && input.averagePercent < 50) {
		return 'A turma está com média crítica no recorte do professor.';
	}

	if (typeof input.averagePercent === 'number' && input.averagePercent < 70) {
		return 'A turma pede atenção pelo desempenho publicado.';
	}

	if (input.studentsAtRisk >= 3) {
		return `A turma concentra ${input.studentsAtRisk} aluno(s) em atenção.`;
	}

	if (input.studentsAtRisk > 0) {
		return `Há ${input.studentsAtRisk} aluno(s) em atenção nesta turma.`;
	}

	return 'A turma está dentro do esperado no recorte atual.';
}

function buildStudentReason(input: {
	status: StudentStatus;
	className: string;
	publishedAssessments: number;
}): string {
	if (input.publishedAssessments === 0) {
		return `Ainda não há base publicada suficiente para este aluno em ${input.className}.`;
	}

	if (input.status === 'critical') {
		return `O aluno aparece com desempenho crítico em ${input.className}.`;
	}

	if (input.status === 'attention') {
		return `O aluno aparece em atenção em ${input.className}.`;
	}

	return `O aluno está dentro do esperado em ${input.className}.`;
}

function classifyAttentionPattern(input: {
	averagePercent: number | null;
	publishedAssessments: number;
	normalizedScoresCount: number;
	coveragePercent: number;
	studentsAtRisk: number;
	classesWithRisk: number;
	totalClasses: number;
}): {
	type: AttentionPatternType;
	label: string;
	reason: string;
} {
	const littleBase =
		input.publishedAssessments < 2 || input.normalizedScoresCount < 8 || input.coveragePercent < 35;

	if (littleBase) {
		return {
			type: 'little_base',
			label: 'Pouca base',
			reason:
				'O professor ainda possui pouca base publicada no escopo para uma leitura institucional mais firme.'
		};
	}

	if (typeof input.averagePercent === 'number' && input.averagePercent < 60) {
		return {
			type: 'low_average',
			label: 'Média baixa geral',
			reason: 'A média consolidada do professor está abaixo da faixa esperada no recorte atual.'
		};
	}

	const broadRisk =
		input.studentsAtRisk >= 3 &&
		input.classesWithRisk >= Math.max(2, Math.ceil(input.totalClasses / 2));

	if (broadRisk) {
		return {
			type: 'broad_risk',
			label: 'Risco distribuído',
			reason:
				'Os sinais de atenção aparecem espalhados por várias turmas do professor dentro do escopo.'
		};
	}

	const concentratedRisk =
		input.studentsAtRisk >= 3 &&
		input.classesWithRisk > 0 &&
		input.classesWithRisk <= Math.max(1, Math.floor(input.totalClasses / 2));

	if (concentratedRisk) {
		return {
			type: 'concentrated_risk',
			label: 'Risco concentrado',
			reason:
				'Os sinais de atenção aparecem concentrados em poucas turmas do professor dentro do escopo.'
		};
	}

	return {
		type: 'stable',
		label: 'Leitura estável',
		reason: 'O professor está dentro do esperado no escopo atual.'
	};
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
	const teacherClasses = scopeClasses.filter((item) => item.teacher_id === params.teacherId);

	if (teacherClasses.length === 0) {
		throw error(404, 'Professor não encontrado no escopo da coordenação.');
	}

	const classIds = teacherClasses.map((item) => item.class_id);

	const { data: studentsData, error: studentsError } = await locals.supabase
		.from('students')
		.select('id, name, class_id, classes(name)')
		.in('class_id', classIds);

	if (studentsError) {
		throw error(500, 'Não foi possível carregar os alunos desse professor.');
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
		throw error(500, 'Não foi possível carregar as publicações do professor.');
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
			throw error(500, 'Não foi possível carregar os resultados publicados do professor.');
		}

		results = (resultsData ?? []) as ResultRow[];
	}

	const latestPublicationDate =
		[...publishedAssessments]
			.map((item) => item.assessment_date)
			.sort((left, right) => right.localeCompare(left))[0] ?? null;

	const classes = teacherClasses
		.map((classRow) => {
			const classStudents = students.filter((item) => item.class_id === classRow.class_id);
			const classAssessmentIds = publishedAssessments
				.filter((item) => item.class_id === classRow.class_id)
				.map((item) => item.id);

			const classResults = results.filter((item) =>
				classAssessmentIds.includes(item.assessment_id)
			);
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

			const expectedResults = classAssessmentIds.length * classStudents.length;
			const coveragePercent =
				expectedResults > 0 ? Math.round((classResults.length / expectedResults) * 100) : 0;

			const priorityScore = scoreClassPriority({
				averagePercent,
				studentsAtRisk,
				publishedAssessments: classAssessmentIds.length,
				coveragePercent
			});

			return {
				classId: classRow.class_id,
				className: classRow.class_name,
				accessCode: classRow.access_code,
				averagePercent,
				averageLabel: formatLabel(averagePercent),
				averagePercentLabel: formatPercentLabel(averagePercent),
				publishedAssessments: classAssessmentIds.length,
				studentsCount: classStudents.length,
				studentsAtRisk,
				coveragePercent,
				priorityScore,
				primaryReason: buildClassReason({
					averagePercent,
					studentsAtRisk,
					publishedAssessments: classAssessmentIds.length,
					coveragePercent
				}),
				detailHref: `/coord/classes/${classRow.class_id}`
			};
		})
		.sort((left, right) => {
			if (right.priorityScore !== left.priorityScore) {
				return right.priorityScore - left.priorityScore;
			}

			return (left.averagePercent ?? 999) - (right.averagePercent ?? 999);
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

			const publishedAssessmentsCount = unique(
				studentResults.map((item) => item.assessment_id)
			).length;
			const status = classifyStudentStatus(averagePercent);

			return {
				studentId: student.id,
				studentName: student.name,
				className: student.class_name,
				averagePercent,
				averageLabel: formatLabel(averagePercent),
				averagePercentLabel: formatPercentLabel(averagePercent),
				publishedAssessments: publishedAssessmentsCount,
				status,
				priorityScore: scoreStudentPriority({
					averagePercent,
					publishedAssessments: publishedAssessmentsCount,
					status
				}),
				primaryReason: buildStudentReason({
					status,
					className: student.class_name,
					publishedAssessments: publishedAssessmentsCount
				}),
				detailHref: `/coord/students/${student.id}`
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null)
		.sort((left, right) => {
			if (right.priorityScore !== left.priorityScore) {
				return right.priorityScore - left.priorityScore;
			}

			return left.averagePercent - right.averagePercent;
		});

	const normalizedResults = results
		.filter((item) => !item.is_excused)
		.map((item) => normalizePercent(item.raw_score, item.score_min, item.score_max))
		.filter((value): value is number => typeof value === 'number');

	const averagePercent = average(normalizedResults);
	const totalStudents = students.length;
	const studentsAtRisk = studentsPriority.filter(
		(item) => item.status === 'critical' || item.status === 'attention'
	).length;

	const totalExpectedResults = publishedAssessments.reduce((sum, assessment) => {
		const classStudents = students.filter((student) => student.class_id === assessment.class_id);
		return sum + classStudents.length;
	}, 0);

	const coveragePercent =
		totalExpectedResults > 0 ? Math.round((results.length / totalExpectedResults) * 100) : 0;

	const classesWithRisk = classes.filter((item) => item.studentsAtRisk > 0).length;

	const attentionPattern = classifyAttentionPattern({
		averagePercent,
		publishedAssessments: publishedAssessments.length,
		normalizedScoresCount: normalizedResults.length,
		coveragePercent,
		studentsAtRisk,
		classesWithRisk,
		totalClasses: teacherClasses.length
	});

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
			averagePercentLabel: formatPercentLabel(averagePercent),
			studentsAtRisk,
			classesWithRisk,
			coveragePercent,
			latestPublicationDate,
			attentionPatternType: attentionPattern.type,
			attentionPatternLabel: attentionPattern.label,
			attentionPatternReason: attentionPattern.reason
		},
		institutionalFocus: {
			coveragePercent,
			attentionPatternType: attentionPattern.type,
			attentionPatternLabel: attentionPattern.label,
			attentionPatternReason: attentionPattern.reason,
			mostSensitiveClass: classes[0] ?? null,
			priorityStudents: studentsPriority.slice(0, 5)
		},
		classes,
		students: studentsPriority.slice(0, 8)
	};
};
