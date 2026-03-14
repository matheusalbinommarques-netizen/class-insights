import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { getAuthenticatedUserId } from '$lib/server/auth';
import { buildSubjectLongitudinalSummaries } from '$lib/server/longitudinal';
import {
	average,
	buildTrendDelta,
	classifyRiskLevel,
	classifyTeacherClassStatus,
	isBelowAttentionThreshold,
	isBelowHighRiskThreshold,
	isSignificantNegativeDelta,
	normalizeResultPercent
} from '$lib/server/teacher-analytics';
import type { LongitudinalPoint } from '$lib/types/academic';
import type {
	TeacherActionQueueItem,
	TeacherAssessmentDropCard,
	TeacherDashboardClassCard,
	TeacherDashboardSummary,
	TeacherRiskStudentCard,
	TeacherStudentComparisonCard
} from '$lib/types/teacher';

type ClassRow = {
	id: string;
	name: string;
	created_at: string;
	score_min: number;
	score_max: number;
	score_decimals: number;
};

type StudentRow = {
	id: string;
	name: string;
	class_id: string;
};

type ClassSubjectRow = {
	class_id: string;
	subject_id: string;
	subjects:
		| {
				name: string;
		  }
		| {
				name: string;
		  }[];
};

type AssessmentRow = {
	id: string;
	class_id: string;
	subject_id: string;
	status: 'draft' | 'published';
	published_at: string | null;
	assessment_date: string;
};

type AssessmentResultSummaryRow = {
	assessment_id: string;
	student_id: string;
	raw_score: number | null;
	score_min: number;
	score_max: number;
	is_excused: boolean;
};

function parseDecimalInput(raw: FormDataEntryValue | null, fallback: number): number {
	const normalized = String(raw ?? '')
		.trim()
		.replace(/\s+/g, '')
		.replace(',', '.');

	if (!normalized) return fallback;
	return Number(normalized);
}

function parseIntegerInput(raw: FormDataEntryValue | null, fallback: number): number {
	const normalized = String(raw ?? '').trim();
	if (!normalized) return fallback;

	return Number(normalized);
}

function buildScaleLabel(item: ClassRow): string {
	return `${item.score_min}-${item.score_max} � dec ${item.score_decimals}`;
}

function buildEmptySummary(displayName: string, message: string): TeacherDashboardSummary {
	return {
		displayName,
		totalClasses: 0,
		totalStudents: 0,
		totalDraftAssessments: 0,
		totalPublishedAssessments: 0,
		totalPendingPublications: 0,
		totalRiskStudents: 0,
		totalPendingCells: 0,
		classesAtRisk: 0,
		classesInSetup: 0,
		healthyClasses: 0,
		message
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = getAuthenticatedUserId(locals);

	if (!userId) {
		return {
			classes: [] as TeacherDashboardClassCard[],
			actionQueue: [] as TeacherActionQueueItem[],
			longitudinalSubjects: [],
			riskStudents: [] as TeacherRiskStudentCard[],
			studentComparisons: [] as TeacherStudentComparisonCard[],
			assessmentDrops: [] as TeacherAssessmentDropCard[],
			summary: buildEmptySummary('Professor', 'Sessao invalida. Faca login novamente.'),
			error: 'Sessao invalida. Faca login novamente.'
		};
	}

	const { data: profileData } = await locals.supabase
		.from('profiles')
		.select('display_name')
		.eq('id', userId)
		.maybeSingle<{ display_name: string }>();

	const displayName = profileData?.display_name?.trim() || 'Professor';

	const { data: classesData, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, name, created_at, score_min, score_max, score_decimals')
		.eq('teacher_id', userId)
		.order('created_at', { ascending: false });

	if (classesError) {
		return {
			classes: [] as TeacherDashboardClassCard[],
			actionQueue: [] as TeacherActionQueueItem[],
			longitudinalSubjects: [],
			riskStudents: [] as TeacherRiskStudentCard[],
			studentComparisons: [] as TeacherStudentComparisonCard[],
			assessmentDrops: [] as TeacherAssessmentDropCard[],
			summary: buildEmptySummary(displayName, 'Houve erro ao carregar as turmas.'),
			error: classesError.message
		};
	}

	const classRows = (classesData ?? []) as ClassRow[];
	const classIds = classRows.map((item) => item.id);

	if (classIds.length === 0) {
		return {
			classes: [] as TeacherDashboardClassCard[],
			actionQueue: [] as TeacherActionQueueItem[],
			longitudinalSubjects: [],
			riskStudents: [] as TeacherRiskStudentCard[],
			studentComparisons: [] as TeacherStudentComparisonCard[],
			assessmentDrops: [] as TeacherAssessmentDropCard[],
			summary: buildEmptySummary(
				displayName,
				'Pronto para transformar dados em progresso? Crie sua primeira turma.'
			),
			error: null
		};
	}

	const [studentsRes, classSubjectsRes, assessmentsRes] = await Promise.all([
		locals.supabase.from('students').select('id, name, class_id').in('class_id', classIds),
		locals.supabase
			.from('class_subjects')
			.select(
				`
					class_id,
					subject_id,
					subjects!inner (
						name
					)
				`
			)
			.in('class_id', classIds),
		locals.supabase
			.from('assessments')
			.select('id, class_id, subject_id, status, published_at, assessment_date')
			.in('class_id', classIds)
	]);

	const students = (studentsRes.data ?? []) as StudentRow[];
	const classSubjects = ((classSubjectsRes.data ?? []) as ClassSubjectRow[])
		.map((item) => {
			const subject = Array.isArray(item.subjects) ? item.subjects[0] : item.subjects;
			if (!subject) return null;

			return {
				class_id: item.class_id,
				subject_id: item.subject_id,
				subject_name: subject.name
			};
		})
		.filter(
			(
				item
			): item is {
				class_id: string;
				subject_id: string;
				subject_name: string;
			} => item !== null
		);
	const assessments = (assessmentsRes.data ?? []) as AssessmentRow[];

	const assessmentIds = assessments.map((assessment) => assessment.id);
	let assessmentResults: AssessmentResultSummaryRow[] = [];
	if (assessmentIds.length > 0) {
		const { data: assessmentResultsData } = await locals.supabase
			.from('assessment_results')
			.select('assessment_id, student_id, raw_score, score_min, score_max, is_excused')
			.in('assessment_id', assessmentIds);

		assessmentResults = (assessmentResultsData ?? []) as AssessmentResultSummaryRow[];
	}

	const studentsByClass = new Map<string, StudentRow[]>();
	for (const student of students) {
		const current = studentsByClass.get(student.class_id) ?? [];
		current.push(student);
		studentsByClass.set(student.class_id, current);
	}

	const subjectsCountByClass = new Map<string, number>();
	const subjectNameByClassAndId = new Map<string, string>();
	for (const classSubject of classSubjects) {
		subjectsCountByClass.set(
			classSubject.class_id,
			(subjectsCountByClass.get(classSubject.class_id) ?? 0) + 1
		);
		subjectNameByClassAndId.set(
			`${classSubject.class_id}:${classSubject.subject_id}`,
			classSubject.subject_name
		);
	}

	const assessmentsByClass = new Map<string, AssessmentRow[]>();
	for (const assessment of assessments) {
		const current = assessmentsByClass.get(assessment.class_id) ?? [];
		current.push(assessment);
		assessmentsByClass.set(assessment.class_id, current);
	}

	const filledAssessmentResultsById = new Map<string, number>();
	for (const result of assessmentResults) {
		if (typeof result.raw_score !== 'number' && !result.is_excused) continue;
		filledAssessmentResultsById.set(
			result.assessment_id,
			(filledAssessmentResultsById.get(result.assessment_id) ?? 0) + 1
		);
	}

	const resultsByAssessmentId = new Map<string, AssessmentResultSummaryRow[]>();
	for (const result of assessmentResults) {
		const current = resultsByAssessmentId.get(result.assessment_id) ?? [];
		current.push(result);
		resultsByAssessmentId.set(result.assessment_id, current);
	}

	const dashboardCards: TeacherDashboardClassCard[] = classRows.map((classRow) => {
		const classStudents = studentsByClass.get(classRow.id) ?? [];
		const classSubjectsCount = subjectsCountByClass.get(classRow.id) ?? 0;
		const classAssessments = assessmentsByClass.get(classRow.id) ?? [];
		const publishedAssessments = classAssessments.filter(
			(assessment) => assessment.status === 'published'
		);
		const draftAssessments = classAssessments.filter((assessment) => assessment.status === 'draft');
		const publishedAssessmentsCount = publishedAssessments.length;
		const draftAssessmentsCount = draftAssessments.length;
		const readyToPublishCount = draftAssessments.filter((assessment) => {
			return (filledAssessmentResultsById.get(assessment.id) ?? 0) > 0;
		}).length;

		const totalExpectedResults = classStudents.length * classAssessments.length;
		const totalExpectedDraftResults = classStudents.length * draftAssessments.length;
		const totalExpectedPublishedResults = classStudents.length * publishedAssessments.length;
		const filledResultsCount = classAssessments.reduce(
			(sum, assessment) => sum + (filledAssessmentResultsById.get(assessment.id) ?? 0),
			0
		);
		const filledDraftResultsCount = draftAssessments.reduce(
			(sum, assessment) => sum + (filledAssessmentResultsById.get(assessment.id) ?? 0),
			0
		);
		const filledPublishedResultsCount = publishedAssessments.reduce(
			(sum, assessment) => sum + (filledAssessmentResultsById.get(assessment.id) ?? 0),
			0
		);
		const pendingResultsCount = Math.max(0, totalExpectedResults - filledResultsCount);
		const draftCoveragePercent =
			totalExpectedDraftResults > 0
				? Math.round((filledDraftResultsCount / totalExpectedDraftResults) * 100)
				: 0;
		const publishedCoveragePercent =
			totalExpectedPublishedResults > 0
				? Math.round((filledPublishedResultsCount / totalExpectedPublishedResults) * 100)
				: 0;

		const normalizedPublishedScores = publishedAssessments.flatMap((assessment) =>
			(resultsByAssessmentId.get(assessment.id) ?? [])
				.map((result) => normalizeResultPercent(result))
				.filter((value): value is number => typeof value === 'number')
		);
		const averagePercentValue = average(normalizedPublishedScores);
		const averagePercent = averagePercentValue !== null ? Math.round(averagePercentValue) : null;

		const publishedStudentScores = new Map<string, number[]>();
		for (const assessment of publishedAssessments) {
			for (const result of resultsByAssessmentId.get(assessment.id) ?? []) {
				const normalized = normalizeResultPercent(result);
				if (normalized === null) continue;

				const current = publishedStudentScores.get(result.student_id) ?? [];
				current.push(normalized);
				publishedStudentScores.set(result.student_id, current);
			}
		}

		const riskStudentsCount = [...publishedStudentScores.values()].filter((scores) => {
			const studentAverage = average(scores);
			return studentAverage !== null && isBelowHighRiskThreshold(studentAverage);
		}).length;

		const trendSeries = [...publishedAssessments]
			.sort((a, b) => a.assessment_date.localeCompare(b.assessment_date))
			.map((assessment) => {
				const resultPercents = (resultsByAssessmentId.get(assessment.id) ?? [])
					.map((result) => normalizeResultPercent(result))
					.filter((value): value is number => typeof value === 'number');

				return average(resultPercents);
			})
			.filter((value): value is number => typeof value === 'number');
		const trendDelta = buildTrendDelta(trendSeries);

		const subjectPerformance = new Map<string, number[]>();
		for (const assessment of publishedAssessments) {
			for (const result of resultsByAssessmentId.get(assessment.id) ?? []) {
				const normalized = normalizeResultPercent(result);
				if (normalized === null) continue;

				const current = subjectPerformance.get(assessment.subject_id) ?? [];
				current.push(normalized);
				subjectPerformance.set(assessment.subject_id, current);
			}
		}

		const focusSubjects = [...subjectPerformance.entries()]
			.map(([subjectId, scores]) => ({
				subjectId,
				avg: average(scores),
				assessmentsCount: publishedAssessments.filter(
					(assessment) => assessment.subject_id === subjectId
				).length
			}))
			.filter(
				(item): item is { subjectId: string; avg: number; assessmentsCount: number } =>
					typeof item.avg === 'number'
			)
			.sort((a, b) => a.avg - b.avg)
			.slice(0, 3)
			.map((item) => {
				const roundedAverage = Math.round(Number(item.avg.toFixed(1)));
				const gapVsClassAverage =
					averagePercent === null ? null : Number((roundedAverage - averagePercent).toFixed(1));
				const tone: TeacherDashboardClassCard['focusSubjects'][number]['tone'] =
					isBelowHighRiskThreshold(roundedAverage)
						? 'critical'
						: isBelowAttentionThreshold(roundedAverage)
							? 'attention'
							: 'healthy';

				return {
					subjectId: item.subjectId,
					subjectName:
						subjectNameByClassAndId.get(`${classRow.id}:${item.subjectId}`) ?? 'Materia sem nome',
					averagePercent: roundedAverage,
					gapVsClassAverage,
					assessmentsCount: item.assessmentsCount,
					tone
				};
			});

		const latestPublicationDate =
			publishedAssessments
				.map((assessment) => assessment.published_at)
				.filter((value): value is string => typeof value === 'string')
				.sort((a, b) => b.localeCompare(a))[0] ?? null;

		const status = classifyTeacherClassStatus({
			studentsCount: classStudents.length,
			subjectsCount: classSubjectsCount,
			assessmentsCount: classAssessments.length,
			publishedAssessmentsCount,
			riskStudentsCount,
			draftCoveragePercent,
			totalExpectedDraftResults,
			draftAssessmentsCount
		});

		return {
			id: classRow.id,
			name: classRow.name,
			created_at: classRow.created_at,
			scaleLabel: buildScaleLabel(classRow),
			studentsCount: classStudents.length,
			subjectsCount: classSubjectsCount,
			assessmentsCount: classAssessments.length,
			publishedAssessmentsCount,
			draftAssessmentsCount,
			readyToPublishCount,
			totalExpectedResults,
			filledResultsCount,
			pendingResultsCount,
			draftCoveragePercent,
			publishedCoveragePercent,
			averagePercent,
			riskStudentsCount,
			latestPublicationDate,
			trendDelta,
			focusSubjects,
			status
		};
	});

	const longitudinalTimeline: LongitudinalPoint[] = assessments
		.filter((assessment) => assessment.status === 'published')
		.flatMap((assessment) => {
			const normalizedScores = (resultsByAssessmentId.get(assessment.id) ?? [])
				.filter((result) => !result.is_excused)
				.map((result) => normalizeResultPercent(result))
				.filter((value): value is number => typeof value === 'number');

			const normalizedPercent = average(normalizedScores);
			if (normalizedPercent === null) return [];

			return [
				{
					assessment_id: assessment.id,
					assessment_title: `Avaliacao ${assessment.assessment_date}`,
					assessment_date: assessment.assessment_date,
					subject_id: assessment.subject_id,
					subject_name:
						subjectNameByClassAndId.get(`${assessment.class_id}:${assessment.subject_id}`) ??
						'Materia sem nome',
					raw_score: null,
					normalized_percent: Math.round(Number(normalizedPercent.toFixed(2))),
					status: assessment.status
				}
			];
		});

	const longitudinalSubjects = buildSubjectLongitudinalSummaries(longitudinalTimeline)
		.sort((a, b) => {
			const left =
				typeof a.average_percent === 'number' ? a.average_percent : Number.POSITIVE_INFINITY;
			const right =
				typeof b.average_percent === 'number' ? b.average_percent : Number.POSITIVE_INFINITY;
			if (left !== right) return left - right;
			return a.subject_name.localeCompare(b.subject_name, 'pt-BR');
		})
		.slice(0, 6);

	const riskStudents: TeacherRiskStudentCard[] = students
		.map((student) => {
			const normalizedScores = assessments
				.filter((assessment) => assessment.status === 'published')
				.flatMap((assessment) =>
					(resultsByAssessmentId.get(assessment.id) ?? [])
						.filter((result) => result.student_id === student.id)
						.map((result) => normalizeResultPercent(result))
						.filter((value): value is number => typeof value === 'number')
				);

			const averagePercent = average(normalizedScores);
			if (averagePercent === null || !isBelowAttentionThreshold(averagePercent)) return null;

			return {
				studentId: student.id,
				studentName: student.name,
				classId: student.class_id,
				className: classRows.find((item) => item.id === student.class_id)?.name ?? 'Turma',
				averagePercent: Math.round(Number(averagePercent.toFixed(1))),
				publishedAssessmentsCount: normalizedScores.length,
				riskLevel: classifyRiskLevel(averagePercent)
			};
		})
		.filter((item): item is TeacherRiskStudentCard => item !== null)
		.sort(
			(a, b) =>
				a.averagePercent - b.averagePercent || a.studentName.localeCompare(b.studentName, 'pt-BR')
		)
		.slice(0, 8);

	const studentComparisons: TeacherStudentComparisonCard[] = students
		.map((student) => {
			const classPublishedAssessments = assessments.filter(
				(assessment) =>
					assessment.class_id === student.class_id && assessment.status === 'published'
			);
			if (classPublishedAssessments.length === 0) return null;

			const classScores = classPublishedAssessments.flatMap((assessment) =>
				(resultsByAssessmentId.get(assessment.id) ?? [])
					.map((result) => normalizeResultPercent(result))
					.filter((value): value is number => typeof value === 'number')
			);
			const studentScores = classPublishedAssessments.flatMap((assessment) =>
				(resultsByAssessmentId.get(assessment.id) ?? [])
					.filter((result) => result.student_id === student.id)
					.map((result) => normalizeResultPercent(result))
					.filter((value): value is number => typeof value === 'number')
			);

			const classAveragePercent = average(classScores);
			const studentAveragePercent = average(studentScores);
			if (classAveragePercent === null || studentAveragePercent === null) return null;

			const gapPercent = Number((studentAveragePercent - classAveragePercent).toFixed(1));
			if (!isSignificantNegativeDelta(gapPercent)) return null;

			return {
				studentId: student.id,
				studentName: student.name,
				classId: student.class_id,
				className: classRows.find((item) => item.id === student.class_id)?.name ?? 'Turma',
				studentAveragePercent: Math.round(Number(studentAveragePercent.toFixed(1))),
				classAveragePercent: Math.round(Number(classAveragePercent.toFixed(1))),
				gapPercent,
				publishedAssessmentsCount: studentScores.length
			};
		})
		.filter((item): item is TeacherStudentComparisonCard => item !== null)
		.sort(
			(a, b) => a.gapPercent - b.gapPercent || a.studentName.localeCompare(b.studentName, 'pt-BR')
		)
		.slice(0, 8);

	const publishedAssessments = assessments.filter(
		(assessment) => assessment.status === 'published'
	);
	const publishedAssessmentsByClassAndSubject = new Map<string, AssessmentRow[]>();
	for (const assessment of publishedAssessments) {
		const key = `${assessment.class_id}:${assessment.subject_id}`;
		const current = publishedAssessmentsByClassAndSubject.get(key) ?? [];
		current.push(assessment);
		publishedAssessmentsByClassAndSubject.set(key, current);
	}

	const assessmentDrops: TeacherAssessmentDropCard[] = [
		...publishedAssessmentsByClassAndSubject.entries()
	]
		.map(([key, subjectAssessments]) => {
			const orderedAssessments = [...subjectAssessments]
				.sort((a, b) => a.assessment_date.localeCompare(b.assessment_date))
				.slice(-2);

			if (orderedAssessments.length < 2) return null;

			const [previousAssessment, latestAssessment] = orderedAssessments;
			const previousScores = (resultsByAssessmentId.get(previousAssessment.id) ?? [])
				.filter((result) => !result.is_excused)
				.map((result) => normalizeResultPercent(result))
				.filter((value): value is number => typeof value === 'number');
			const latestScores = (resultsByAssessmentId.get(latestAssessment.id) ?? [])
				.filter((result) => !result.is_excused)
				.map((result) => normalizeResultPercent(result))
				.filter((value): value is number => typeof value === 'number');

			const previousAverage = average(previousScores);
			const latestAverage = average(latestScores);
			if (previousAverage === null || latestAverage === null) return null;

			const dropPercent = Number((latestAverage - previousAverage).toFixed(1));
			if (!isSignificantNegativeDelta(dropPercent)) return null;

			const [classId, subjectId] = key.split(':');

			return {
				classId,
				className: classRows.find((item) => item.id === classId)?.name ?? 'Turma',
				subjectId,
				subjectName: subjectNameByClassAndId.get(key) ?? 'Materia sem nome',
				latestAssessmentId: latestAssessment.id,
				latestAssessmentDate: latestAssessment.assessment_date,
				previousAssessmentDate: previousAssessment.assessment_date,
				latestAveragePercent: Math.round(Number(latestAverage.toFixed(1))),
				previousAveragePercent: Math.round(Number(previousAverage.toFixed(1))),
				dropPercent,
				sampleSize: latestScores.length
			};
		})
		.filter((item): item is TeacherAssessmentDropCard => item !== null)
		.sort(
			(a, b) => a.dropPercent - b.dropPercent || a.subjectName.localeCompare(b.subjectName, 'pt-BR')
		)
		.slice(0, 8);

	const operationalQueue: TeacherActionQueueItem[] = dashboardCards
		.flatMap((item) => {
			const queue: TeacherActionQueueItem[] = [];

			if (item.studentsCount === 0) {
				queue.push({
					id: `${item.id}-students`,
					classId: item.id,
					title: `${item.name} precisa de alunos`,
					description: 'A turma existe, mas ainda nao possui alunos cadastrados.',
					ctaLabel: 'Abrir turma',
					href: `/teacher/${item.id}`,
					priority: 0,
					signalType: 'operational'
				});
			}

			if (item.subjectsCount === 0) {
				queue.push({
					id: `${item.id}-subjects`,
					classId: item.id,
					title: `${item.name} precisa de materias`,
					description: 'Sem materias, a turma ainda nao entra no fluxo formal de avaliacao.',
					ctaLabel: 'Abrir turma',
					href: `/teacher/${item.id}`,
					priority: 0,
					signalType: 'operational'
				});
			}

			if (item.studentsCount > 0 && item.subjectsCount > 0 && item.assessmentsCount === 0) {
				queue.push({
					id: `${item.id}-assessments`,
					classId: item.id,
					title: `${item.name} ainda nao tem avaliacoes`,
					description: 'A proxima acao e criar a primeira avaliacao desta turma.',
					ctaLabel: 'Abrir turma',
					href: `/teacher/${item.id}`,
					priority: 1,
					signalType: 'operational'
				});
			}

			if (item.readyToPublishCount > 0) {
				queue.push({
					id: `${item.id}-publish`,
					classId: item.id,
					title: `${item.name} tem ${item.readyToPublishCount} avaliacao(oes) pronta(s) para publicar`,
					description: 'Ja existe resultado salvo em rascunho e vale fechar a leitura oficial.',
					ctaLabel: 'Abrir avaliacoes',
					href: `/teacher/assessments`,
					priority: 1,
					signalType: 'operational'
				});
			}

			if (item.pendingResultsCount > 0) {
				queue.push({
					id: `${item.id}-coverage`,
					classId: item.id,
					title: `${item.name} tem ${item.pendingResultsCount} resultado(s) pendente(s)`,
					description: `Cobertura dos rascunhos: ${item.draftCoveragePercent}%. Ainda ha lacunas para fechar as avaliacoes abertas.`,
					ctaLabel: 'Abrir turma',
					href: `/teacher/${item.id}`,
					priority: item.draftCoveragePercent < 60 ? 0 : 2,
					signalType: 'operational'
				});
			}

			return queue;
		})
		.sort((a, b) => a.priority - b.priority)
		.slice(0, 6);

	const pedagogicalQueue: TeacherActionQueueItem[] = [
		...riskStudents.slice(0, 3).map((student, index) => ({
			id: `risk-${student.studentId}`,
			classId: student.classId,
			title: `${student.studentName} pede leitura individual`,
			description: `${student.className} - media publicada em ${student.averagePercent}%. Vale abrir a trajetoria individual para entender onde a queda se concentra.`,
			ctaLabel: 'Abrir perfil do aluno',
			href: `/teacher/students/${student.studentId}`,
			priority: index,
			signalType: 'pedagogical' as const
		})),
		...studentComparisons.slice(0, 3).map((item, index) => ({
			id: `gap-${item.studentId}`,
			classId: item.classId,
			title: `${item.studentName} esta abaixo da media da turma`,
			description: `${item.className} - gap de ${item.gapPercent} pontos contra a media publicada da turma.`,
			ctaLabel: 'Abrir perfil do aluno',
			href: `/teacher/students/${item.studentId}`,
			priority: index + 1,
			signalType: 'pedagogical' as const
		})),
		...assessmentDrops.slice(0, 2).map((item, index) => ({
			id: `drop-${item.latestAssessmentId}`,
			classId: item.classId,
			title: `${item.subjectName} recuou em ${item.className}`,
			description: `A media da turma caiu ${item.dropPercent} pontos entre as duas publicacoes mais recentes desta materia.`,
			ctaLabel: 'Abrir avaliacao',
			href: `/teacher/assessments/${item.latestAssessmentId}`,
			priority: index + 1,
			signalType: 'pedagogical' as const
		}))
	]
		.sort((a, b) => a.priority - b.priority)
		.slice(0, 6);

	const actionQueue: TeacherActionQueueItem[] = [...operationalQueue, ...pedagogicalQueue];

	const totalClasses = dashboardCards.length;
	const totalStudents = dashboardCards.reduce((sum, item) => sum + item.studentsCount, 0);
	const totalDraftAssessments = dashboardCards.reduce(
		(sum, item) => sum + item.draftAssessmentsCount,
		0
	);
	const totalPublishedAssessments = dashboardCards.reduce(
		(sum, item) => sum + item.publishedAssessmentsCount,
		0
	);
	const totalPendingPublications = dashboardCards.reduce(
		(sum, item) => sum + item.readyToPublishCount,
		0
	);
	const totalRiskStudents = dashboardCards.reduce((sum, item) => sum + item.riskStudentsCount, 0);
	const totalPendingCells = dashboardCards.reduce((sum, item) => sum + item.pendingResultsCount, 0);
	const classesAtRisk = dashboardCards.filter(
		(item) => item.status === 'critical' || item.riskStudentsCount > 0
	).length;
	const classesInSetup = dashboardCards.filter((item) => item.status === 'setup').length;
	const healthyClasses = dashboardCards.filter((item) => item.status === 'healthy').length;

	let message = 'Seu workspace teacher esta pronto para operar no fluxo novo.';
	if (totalClasses === 0) {
		message = 'Pronto para transformar dados em progresso? Crie sua primeira turma.';
	} else if (classesInSetup > 0) {
		message = `Voce tem ${classesInSetup} turma(s) ainda montando base de alunos e materias.`;
	} else if (totalPendingPublications > 0) {
		message = `Ha ${totalPendingPublications} avaliacao(oes) pronta(s) para publicar agora.`;
	} else if (totalDraftAssessments > 0) {
		message = `${totalDraftAssessments} avaliacao(oes) seguem em rascunho aguardando fechamento.`;
	} else if (totalPendingCells > 0) {
		message = `Ha ${totalPendingCells} resultado(s) ainda pendente(s) nas suas turmas.`;
	} else if (longitudinalSubjects.length > 0) {
		message = 'As materias com menor media publicada ja aparecem no longitudinal do dashboard.';
	}

	return {
		classes: dashboardCards,
		actionQueue,
		longitudinalSubjects,
		riskStudents,
		studentComparisons,
		assessmentDrops,
		summary: {
			displayName,
			totalClasses,
			totalStudents,
			totalDraftAssessments,
			totalPublishedAssessments,
			totalPendingPublications,
			totalRiskStudents,
			totalPendingCells,
			classesAtRisk,
			classesInSetup,
			healthyClasses,
			message
		},
		error: null
	};
};

export const actions: Actions = {
	createClass: async ({ request, locals }) => {
		const form = await request.formData();

		const name = String(form.get('name') ?? '').trim();
		const scoreMin = parseDecimalInput(form.get('score_min'), 0);
		const scoreMax = parseDecimalInput(form.get('score_max'), 10);
		const scoreDecimals = parseIntegerInput(form.get('score_decimals'), 0);

		if (!name) {
			return fail(400, { action: 'createClass', message: 'Nome da turma e obrigatorio.' });
		}

		if (!Number.isFinite(scoreMin) || !Number.isFinite(scoreMax)) {
			return fail(400, {
				action: 'createClass',
				message: 'Escala invalida: min e max precisam ser numericos.'
			});
		}

		if (!(scoreMax > scoreMin)) {
			return fail(400, {
				action: 'createClass',
				message: 'Escala invalida: max precisa ser > min.'
			});
		}

		if (!Number.isInteger(scoreDecimals) || scoreDecimals < 0 || scoreDecimals > 6) {
			return fail(400, {
				action: 'createClass',
				message: 'Decimais invalidos (0 a 6).'
			});
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createClass', message: 'Voce precisa estar logado.' });
		}

		const { error } = await locals.supabase.from('classes').insert({
			name,
			teacher_id: userId,
			score_min: scoreMin,
			score_max: scoreMax,
			score_decimals: scoreDecimals
		});

		if (error) {
			return fail(400, { action: 'createClass', message: error.message });
		}

		return {
			success: true,
			action: 'createClass',
			message: 'Turma criada com sucesso.'
		};
	},

	deleteClass: async ({ request, locals }) => {
		const form = await request.formData();
		const classId = String(form.get('classId') ?? '').trim();

		if (!classId) {
			return fail(400, { action: 'deleteClass', message: 'classId obrigatorio.' });
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'deleteClass', message: 'Voce precisa estar logado.' });
		}

		const { error } = await locals.supabase
			.from('classes')
			.delete()
			.eq('id', classId)
			.eq('teacher_id', userId);

		if (error) {
			return fail(400, { action: 'deleteClass', message: error.message });
		}

		return {
			success: true,
			action: 'deleteClass',
			message: 'Turma removida com sucesso.'
		};
	},

	generateClassSnapshot: async ({ request, locals }) => {
		const form = await request.formData();
		const classId = String(form.get('classId') ?? '').trim();

		if (!classId) {
			return fail(400, {
				action: 'generateClassSnapshot',
				message: 'classId obrigatorio.'
			});
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, {
				action: 'generateClassSnapshot',
				message: 'Voce precisa estar logado.'
			});
		}

		const { data: ownedClass, error: classError } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.eq('teacher_id', userId)
			.maybeSingle<{ id: string }>();

		if (classError || !ownedClass) {
			return fail(404, {
				action: 'generateClassSnapshot',
				message: 'Turma nao encontrada.'
			});
		}

		const { error } = await locals.supabase.rpc('generate_mastery_snapshot', {
			p_class_id: classId
		});

		if (error) {
			return fail(400, {
				action: 'generateClassSnapshot',
				message: error.message
			});
		}

		return {
			success: true,
			action: 'generateClassSnapshot',
			message: 'Snapshot gerado com sucesso.'
		};
	}
};
