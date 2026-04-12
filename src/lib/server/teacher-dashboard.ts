import { getAuthenticatedUserId } from '$lib/server/auth';
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
import { formatPercentAsGrade, formatPtBrGrade } from '$lib/utils/format';
import type {
	TeacherDashboardPageData,
	TeacherDashboardRiskTone,
	TeacherDashboardTrendTone
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

type DashboardClassStats = {
	id: string;
	name: string;
	created_at: string;
	studentsCount: number;
	subjectsCount: number;
	assessmentsCount: number;
	publishedAssessmentsCount: number;
	draftAssessmentsCount: number;
	readyToPublishCount: number;
	pendingResultsCount: number;
	draftCoveragePercent: number;
	publishedCoveragePercent: number;
	averagePercent: number | null;
	riskStudentsCount: number;
	trendDelta: number | null;
	status: 'setup' | 'healthy' | 'attention' | 'critical';
};

type SubjectPerformance = {
	classId: string;
	className: string;
	subjectId: string;
	subjectName: string;
	averagePercent: number;
	trendDelta: number | null;
	assessmentsCount: number;
};

type ActionStep = {
	title: string;
	text: string;
	href: string;
	priority: number;
};

type FallingStudentInternal = {
	studentName: string;
	publishedAverageLabel: string;
	riskLabel: string;
	riskTone: TeacherDashboardRiskTone;
	helperText: string;
	href: string;
	sortTrend: number;
	sortAverage: number;
};

type RelevantGapInternal = {
	studentName: string;
	gapLabel: string;
	riskLabel: string;
	riskTone: TeacherDashboardRiskTone;
	helperText: string;
	subjects: string[];
	href: string;
	sortGap: number;
};

const GAP_HIGH_RISK_DELTA = 10;
const TREND_NEUTRAL_DELTA = 1;

function buildEmptyDashboard(
	displayName: string,
	message: string,
	error: string | null
): TeacherDashboardPageData {
	return {
		teacherName: displayName,
		syncLabel: 'Sessao ativa - Ultima sincronizacao indisponivel',
		actionNow: {
			draftClasses: 0,
			belowReferenceSubjects: 0,
			fallingStudents: 0,
			classesWithoutSubject: 0,
			nextStepTitle: 'Proximo passo',
			nextStepText: message,
			nextStepHref: '/teacher/classes/new'
		},
		performanceChanges: {
			belowReferenceSubjects: [],
			belowReferenceSubjectsHref: '/teacher/subjects',
			fallingStudents: [],
			fallingStudentsHref: '/teacher',
			relevantGaps: [],
			relevantGapsHref: '/teacher'
		},
		classesSummary: [],
		analyticsSummary: {
			rangeLabel: 'Ultimos 30 dias',
			buckets: [
				{ label: 'Abaixo 5', value: 0, heightPercent: 0 },
				{ label: '5-7', value: 0, heightPercent: 0 },
				{ label: '7-9', value: 0, heightPercent: 0 },
				{ label: 'Acima 9', value: 0, heightPercent: 0 }
			]
		},
		error
	};
}

function parseDateValue(value: string | null): Date | null {
	if (!value) return null;
	const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
	return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelativeSyncLabel(value: string | null, now = new Date()) {
	const date = parseDateValue(value);
	if (!date) return 'Sessao ativa - Ultima sincronizacao indisponivel';

	const diffMinutes = Math.max(1, Math.floor((now.getTime() - date.getTime()) / 60000));
	if (diffMinutes < 60) return `Sessao ativa - Ultima sincronizacao ha ${diffMinutes} min`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `Sessao ativa - Ultima sincronizacao ha ${diffHours} h`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `Sessao ativa - Ultima sincronizacao ha ${diffDays} dia(s)`;

	return `Sessao ativa - Ultima sincronizacao em ${new Intl.DateTimeFormat('pt-BR', {
		dateStyle: 'short'
	}).format(date)}`;
}

function formatGradeLabel(value: number | null) {
	return `${formatPercentAsGrade(value)} / 10`;
}

function formatSignedGradeLabel(value: number | null) {
	if (typeof value !== 'number' || Math.abs(value) < TREND_NEUTRAL_DELTA) return 'Estavel';
	const absolute = formatPtBrGrade(Math.abs(value) / 10);
	return `${value >= 0 ? '+' : '-'}${absolute}`;
}

function formatGapLabel(value: number | null) {
	if (typeof value !== 'number') return '--';
	const absolute = formatPtBrGrade(Math.abs(value) / 10);
	return `${value >= 0 ? '+' : '-'}${absolute}`;
}

function trendTone(value: number | null): TeacherDashboardTrendTone {
	if (typeof value !== 'number' || Math.abs(value) < TREND_NEUTRAL_DELTA) return 'neutral';
	return value > 0 ? 'positive' : 'negative';
}

function statusTone(status: DashboardClassStats['status']): TeacherDashboardRiskTone {
	if (status === 'critical') return 'critical';
	if (status === 'attention' || status === 'setup') return 'attention';
	return 'neutral';
}

function gapRiskTone(gapPercent: number): TeacherDashboardRiskTone {
	return gapPercent <= -GAP_HIGH_RISK_DELTA ? 'critical' : 'attention';
}

function gapRiskLabel(gapPercent: number) {
	return gapPercent <= -GAP_HIGH_RISK_DELTA ? 'Risco alto' : 'Risco moderado';
}

function buildAnalyticsBuckets(values: number[]) {
	const buckets = [
		{ label: 'Abaixo 5', value: 0 },
		{ label: '5-7', value: 0 },
		{ label: '7-9', value: 0 },
		{ label: 'Acima 9', value: 0 }
	];

	for (const value of values) {
		const grade = value / 10;
		if (grade < 5) buckets[0].value += 1;
		else if (grade < 7) buckets[1].value += 1;
		else if (grade < 9) buckets[2].value += 1;
		else buckets[3].value += 1;
	}

	const maxValue = Math.max(...buckets.map((bucket) => bucket.value), 0);

	return buckets.map((bucket) => ({
		...bucket,
		heightPercent: maxValue === 0 ? 0 : Math.max(14, Math.round((bucket.value / maxValue) * 100))
	}));
}

export async function buildTeacherDashboardPageData(
	locals: App.Locals
): Promise<TeacherDashboardPageData> {
	const userId = getAuthenticatedUserId(locals);

	if (!userId) {
		return buildEmptyDashboard(
			'Professor',
			'Sessao invalida. Faca login novamente.',
			'Sessao invalida. Faca login novamente.'
		);
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
		return buildEmptyDashboard(
			displayName,
			'Houve erro ao carregar as turmas.',
			classesError.message
		);
	}

	const classRows = (classesData ?? []) as ClassRow[];
	const classIds = classRows.map((item) => item.id);

	if (classIds.length === 0) {
		return {
			...buildEmptyDashboard(
				displayName,
				'Crie a primeira turma para ativar materias, avaliacoes e a leitura do professor.',
				null
			),
			actionNow: {
				draftClasses: 0,
				belowReferenceSubjects: 0,
				fallingStudents: 0,
				classesWithoutSubject: 0,
				nextStepTitle: 'Proximo passo',
				nextStepText: 'Crie a primeira turma para ativar o fluxo principal do professor.',
				nextStepHref: '/teacher/classes/new'
			}
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

	const firstDataError =
		studentsRes.error ?? classSubjectsRes.error ?? assessmentsRes.error ?? null;

	if (firstDataError) {
		return buildEmptyDashboard(
			displayName,
			'Nao foi possivel montar o dashboard do professor.',
			firstDataError.message
		);
	}

	const students = (studentsRes.data ?? []) as StudentRow[];
	const classSubjects = ((classSubjectsRes.data ?? []) as ClassSubjectRow[])
		.map((item) => {
			const subject = Array.isArray(item.subjects) ? item.subjects[0] : item.subjects;
			return subject
				? { class_id: item.class_id, subject_id: item.subject_id, subject_name: subject.name }
				: null;
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
		const { data, error } = await locals.supabase
			.from('assessment_results')
			.select('assessment_id, student_id, raw_score, score_min, score_max, is_excused')
			.in('assessment_id', assessmentIds);

		if (error) {
			return buildEmptyDashboard(
				displayName,
				'Nao foi possivel carregar os resultados publicados.',
				error.message
			);
		}

		assessmentResults = (data ?? []) as AssessmentResultSummaryRow[];
	}

	const classNameById = new Map(classRows.map((item) => [item.id, item.name]));
	const classOrderById = new Map(classRows.map((item, index) => [item.id, index]));
	const studentsByClass = new Map<string, StudentRow[]>();
	const subjectsByClass = new Map<string, Array<{ subjectId: string; subjectName: string }>>();
	const subjectsCountByClass = new Map<string, number>();
	const subjectNameByClassAndId = new Map<string, string>();
	const assessmentsByClass = new Map<string, AssessmentRow[]>();
	const filledAssessmentResultsById = new Map<string, number>();
	const resultsByAssessmentId = new Map<string, AssessmentResultSummaryRow[]>();

	for (const student of students) {
		studentsByClass.set(student.class_id, [
			...(studentsByClass.get(student.class_id) ?? []),
			student
		]);
	}

	for (const classSubject of classSubjects) {
		subjectsByClass.set(classSubject.class_id, [
			...(subjectsByClass.get(classSubject.class_id) ?? []),
			{ subjectId: classSubject.subject_id, subjectName: classSubject.subject_name }
		]);

		subjectsCountByClass.set(
			classSubject.class_id,
			(subjectsCountByClass.get(classSubject.class_id) ?? 0) + 1
		);

		subjectNameByClassAndId.set(
			`${classSubject.class_id}:${classSubject.subject_id}`,
			classSubject.subject_name
		);
	}

	for (const assessment of assessments) {
		assessmentsByClass.set(assessment.class_id, [
			...(assessmentsByClass.get(assessment.class_id) ?? []),
			assessment
		]);
	}

	for (const result of assessmentResults) {
		if (typeof result.raw_score === 'number' || result.is_excused) {
			filledAssessmentResultsById.set(
				result.assessment_id,
				(filledAssessmentResultsById.get(result.assessment_id) ?? 0) + 1
			);
		}

		resultsByAssessmentId.set(result.assessment_id, [
			...(resultsByAssessmentId.get(result.assessment_id) ?? []),
			result
		]);
	}

	const dashboardClasses = classRows.map<DashboardClassStats>((classRow) => {
		const classStudents = studentsByClass.get(classRow.id) ?? [];
		const classAssessments = assessmentsByClass.get(classRow.id) ?? [];
		const classPublishedAssessments = classAssessments.filter(
			(item) => item.status === 'published'
		);
		const draftAssessments = classAssessments.filter((item) => item.status === 'draft');

		const readyToPublishCount = draftAssessments.filter(
			(item) => (filledAssessmentResultsById.get(item.id) ?? 0) > 0
		).length;

		const totalExpectedResults = classStudents.length * classAssessments.length;
		const totalExpectedDraftResults = classStudents.length * draftAssessments.length;
		const totalExpectedPublishedResults = classStudents.length * classPublishedAssessments.length;

		const filledResultsCount = classAssessments.reduce(
			(sum, item) => sum + (filledAssessmentResultsById.get(item.id) ?? 0),
			0
		);

		const filledDraftResultsCount = draftAssessments.reduce(
			(sum, item) => sum + (filledAssessmentResultsById.get(item.id) ?? 0),
			0
		);

		const filledPublishedResultsCount = classPublishedAssessments.reduce(
			(sum, item) => sum + (filledAssessmentResultsById.get(item.id) ?? 0),
			0
		);

		const publishedScores = classPublishedAssessments.flatMap((assessment) =>
			(resultsByAssessmentId.get(assessment.id) ?? [])
				.map((result) => normalizeResultPercent(result))
				.filter((value): value is number => typeof value === 'number')
		);

		const publishedStudentScores = new Map<string, number[]>();

		for (const assessment of classPublishedAssessments) {
			for (const result of resultsByAssessmentId.get(assessment.id) ?? []) {
				const normalized = normalizeResultPercent(result);
				if (normalized === null) continue;

				publishedStudentScores.set(result.student_id, [
					...(publishedStudentScores.get(result.student_id) ?? []),
					normalized
				]);
			}
		}

		const trendSeries = [...classPublishedAssessments]
			.sort((a, b) => a.assessment_date.localeCompare(b.assessment_date))
			.map((assessment) => {
				const scores = (resultsByAssessmentId.get(assessment.id) ?? [])
					.map((result) => normalizeResultPercent(result))
					.filter((value): value is number => typeof value === 'number');

				return average(scores);
			})
			.filter((value): value is number => typeof value === 'number');

		const riskStudentsCount = [...publishedStudentScores.values()].filter((scores) => {
			const studentAverage = average(scores);
			return studentAverage !== null && isBelowHighRiskThreshold(studentAverage);
		}).length;

		const draftCoveragePercent =
			totalExpectedDraftResults > 0
				? Math.round((filledDraftResultsCount / totalExpectedDraftResults) * 100)
				: 0;

		return {
			id: classRow.id,
			name: classRow.name,
			created_at: classRow.created_at,
			studentsCount: classStudents.length,
			subjectsCount: subjectsCountByClass.get(classRow.id) ?? 0,
			assessmentsCount: classAssessments.length,
			publishedAssessmentsCount: classPublishedAssessments.length,
			draftAssessmentsCount: draftAssessments.length,
			readyToPublishCount,
			pendingResultsCount: Math.max(0, totalExpectedResults - filledResultsCount),
			draftCoveragePercent,
			publishedCoveragePercent:
				totalExpectedPublishedResults > 0
					? Math.round((filledPublishedResultsCount / totalExpectedPublishedResults) * 100)
					: 0,
			averagePercent:
				average(publishedScores) === null ? null : Number(average(publishedScores)!.toFixed(1)),
			riskStudentsCount,
			trendDelta: buildTrendDelta(trendSeries),
			status: classifyTeacherClassStatus({
				studentsCount: classStudents.length,
				subjectsCount: subjectsCountByClass.get(classRow.id) ?? 0,
				assessmentsCount: classAssessments.length,
				publishedAssessmentsCount: classPublishedAssessments.length,
				riskStudentsCount,
				draftCoveragePercent,
				totalExpectedDraftResults,
				draftAssessmentsCount: draftAssessments.length
			})
		};
	});

	const publishedAssessments = assessments.filter(
		(assessment) => assessment.status === 'published'
	);

	const subjectPerformances = classSubjects
		.map<SubjectPerformance | null>((classSubject) => {
			const subjectAssessments = publishedAssessments.filter(
				(item) =>
					item.class_id === classSubject.class_id && item.subject_id === classSubject.subject_id
			);

			if (subjectAssessments.length === 0) return null;

			const scores = subjectAssessments.flatMap((assessment) =>
				(resultsByAssessmentId.get(assessment.id) ?? [])
					.map((result) => normalizeResultPercent(result))
					.filter((value): value is number => typeof value === 'number')
			);

			const averagePercent = average(scores);
			if (averagePercent === null) return null;

			const trendSeries = [...subjectAssessments]
				.sort((a, b) => a.assessment_date.localeCompare(b.assessment_date))
				.map((assessment) => {
					const assessmentScores = (resultsByAssessmentId.get(assessment.id) ?? [])
						.map((result) => normalizeResultPercent(result))
						.filter((value): value is number => typeof value === 'number');

					return average(assessmentScores);
				})
				.filter((value): value is number => typeof value === 'number');

			return {
				classId: classSubject.class_id,
				className: classNameById.get(classSubject.class_id) ?? 'Turma',
				subjectId: classSubject.subject_id,
				subjectName: classSubject.subject_name,
				averagePercent: Number(averagePercent.toFixed(1)),
				trendDelta: buildTrendDelta(trendSeries),
				assessmentsCount: subjectAssessments.length
			};
		})
		.filter((item): item is SubjectPerformance => item !== null)
		.sort((a, b) => a.averagePercent - b.averagePercent);

	const fallingStudents = students
		.map<FallingStudentInternal | null>((student) => {
			const series = publishedAssessments
				.filter((assessment) => assessment.class_id === student.class_id)
				.sort((a, b) => a.assessment_date.localeCompare(b.assessment_date))
				.map((assessment) => {
					const result = (resultsByAssessmentId.get(assessment.id) ?? []).find(
						(item) => item.student_id === student.id
					);

					return result ? normalizeResultPercent(result) : null;
				})
				.filter((value): value is number => typeof value === 'number');

			const trendDelta = buildTrendDelta(series);
			const averagePercent = average(series);

			if (
				typeof trendDelta !== 'number' ||
				averagePercent === null ||
				!isSignificantNegativeDelta(trendDelta)
			) {
				return null;
			}

			const riskLevel =
				averagePercent < 40 || trendDelta <= -10 ? 'high' : classifyRiskLevel(averagePercent);

			return {
				studentName: student.name,
				publishedAverageLabel: formatGradeLabel(Number(averagePercent.toFixed(1))),
				riskLabel: riskLevel === 'high' ? 'Risco alto' : 'Risco moderado',
				riskTone: (riskLevel === 'high' ? 'critical' : 'attention') as TeacherDashboardRiskTone,
				helperText: `${classNameById.get(student.class_id) ?? 'Turma'} - queda de ${formatGapLabel(trendDelta)}`,
				href: `/teacher/students/${student.id}`,
				sortTrend: trendDelta,
				sortAverage: averagePercent
			};
		})
		.filter((item): item is FallingStudentInternal => item !== null)
		.sort((a, b) => a.sortTrend - b.sortTrend || a.sortAverage - b.sortAverage)
		.map((item) => {
			const { sortTrend, sortAverage, ...rest } = item;
			void sortTrend;
			void sortAverage;
			return rest;
		});

	const relevantGaps = students
		.map<RelevantGapInternal | null>((student) => {
			const classPublishedAssessments = publishedAssessments.filter(
				(assessment) => assessment.class_id === student.class_id
			);

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

			const classAverage = average(classScores);
			const studentAverage = average(studentScores);

			if (classAverage === null || studentAverage === null) return null;

			const gapPercent = Number((studentAverage - classAverage).toFixed(1));
			if (!isSignificantNegativeDelta(gapPercent)) return null;

			const subjectTags = [
				...new Set(classPublishedAssessments.map((assessment) => assessment.subject_id))
			]
				.map((subjectId) => {
					const subjectAssessments = classPublishedAssessments.filter(
						(assessment) => assessment.subject_id === subjectId
					);

					const subjectClassScores = subjectAssessments.flatMap((assessment) =>
						(resultsByAssessmentId.get(assessment.id) ?? [])
							.map((result) => normalizeResultPercent(result))
							.filter((value): value is number => typeof value === 'number')
					);

					const subjectStudentScores = subjectAssessments.flatMap((assessment) =>
						(resultsByAssessmentId.get(assessment.id) ?? [])
							.filter((result) => result.student_id === student.id)
							.map((result) => normalizeResultPercent(result))
							.filter((value): value is number => typeof value === 'number')
					);

					const subjectClassAverage = average(subjectClassScores);
					const subjectStudentAverage = average(subjectStudentScores);

					if (subjectClassAverage === null || subjectStudentAverage === null) return null;

					return {
						name: subjectNameByClassAndId.get(`${student.class_id}:${subjectId}`) ?? 'Materia',
						gapPercent: Number((subjectStudentAverage - subjectClassAverage).toFixed(1))
					};
				})
				.filter(
					(item): item is { name: string; gapPercent: number } =>
						item !== null && item.gapPercent < 0
				)
				.sort((a, b) => a.gapPercent - b.gapPercent)
				.slice(0, 3)
				.map((item) => item.name);

			return {
				studentName: student.name,
				gapLabel: formatGapLabel(gapPercent),
				riskLabel: gapRiskLabel(gapPercent),
				riskTone: gapRiskTone(gapPercent),
				helperText: `Gap de ${formatGapLabel(gapPercent)} em relacao a ${classNameById.get(student.class_id) ?? 'Turma'}.`,
				subjects: subjectTags,
				href: `/teacher/${student.class_id}`,
				sortGap: gapPercent
			};
		})
		.filter((item): item is RelevantGapInternal => item !== null)
		.sort((a, b) => a.sortGap - b.sortGap)
		.map((item) => {
			const { sortGap, ...rest } = item;
			void sortGap;
			return rest;
		});

	const actionSteps = dashboardClasses
		.flatMap<ActionStep>((classItem) => {
			const steps: ActionStep[] = [];

			if (classItem.studentsCount === 0) {
				steps.push({
					title: 'Proximo passo',
					text: `${classItem.name} ainda nao tem alunos cadastrados.`,
					href: `/teacher/${classItem.id}`,
					priority: 0
				});
			}

			if (classItem.subjectsCount === 0) {
				steps.push({
					title: 'Proximo passo',
					text: `${classItem.name} ainda precisa de materia vinculada.`,
					href: `/teacher/${classItem.id}`,
					priority: 0
				});
			}

			if (
				classItem.studentsCount > 0 &&
				classItem.subjectsCount > 0 &&
				classItem.assessmentsCount === 0
			) {
				steps.push({
					title: 'Proximo passo',
					text: `${classItem.name} ja pode abrir a primeira avaliacao.`,
					href: `/teacher/${classItem.id}`,
					priority: 1
				});
			}

			if (classItem.readyToPublishCount > 0) {
				steps.push({
					title: 'Proximo passo',
					text: `${classItem.name} tem ${classItem.readyToPublishCount} rascunho(s) pronto(s) para fechar.`,
					href: `/teacher/${classItem.id}`,
					priority: 1
				});
			}

			if (classItem.pendingResultsCount > 0) {
				steps.push({
					title: 'Proximo passo',
					text: `${classItem.name} ainda tem ${classItem.pendingResultsCount} resultado(s) pendente(s).`,
					href: `/teacher/${classItem.id}`,
					priority: classItem.draftCoveragePercent < 60 ? 1 : 2
				});
			}

			return steps;
		})
		.sort((a, b) => a.priority - b.priority);

	const latestActivityAt =
		[
			...publishedAssessments.map(
				(assessment) => assessment.published_at ?? assessment.assessment_date
			),
			...dashboardClasses.map((item) => item.created_at)
		]
			.filter((value): value is string => typeof value === 'string')
			.sort((a, b) => b.localeCompare(a))[0] ?? null;

	const recentReferenceDate =
		parseDateValue(
			[
				...publishedAssessments.map(
					(assessment) => assessment.published_at ?? assessment.assessment_date
				)
			]
				.filter((value): value is string => typeof value === 'string')
				.sort((a, b) => b.localeCompare(a))[0] ?? latestActivityAt
		) ?? new Date();

	const recentStartDate = new Date(recentReferenceDate);
	recentStartDate.setDate(recentStartDate.getDate() - 30);

	const recentAssessmentIds = new Set(
		publishedAssessments
			.filter((assessment) => {
				const assessmentDate = parseDateValue(
					assessment.published_at ?? assessment.assessment_date
				);

				return (
					assessmentDate !== null &&
					assessmentDate >= recentStartDate &&
					assessmentDate <= recentReferenceDate
				);
			})
			.map((assessment) => assessment.id)
	);

	const studentAveragesInWindow = students
		.map((student) => {
			const scores = publishedAssessments.flatMap((assessment) => {
				if (assessment.class_id !== student.class_id) return [];
				if (recentAssessmentIds.size > 0 && !recentAssessmentIds.has(assessment.id)) return [];

				return (resultsByAssessmentId.get(assessment.id) ?? [])
					.filter((result) => result.student_id === student.id)
					.map((result) => normalizeResultPercent(result))
					.filter((value): value is number => typeof value === 'number');
			});

			return average(scores);
		})
		.filter((value): value is number => typeof value === 'number');

	const fallbackStudentAverages = students
		.map((student) => {
			const scores = publishedAssessments.flatMap((assessment) => {
				if (assessment.class_id !== student.class_id) return [];

				return (resultsByAssessmentId.get(assessment.id) ?? [])
					.filter((result) => result.student_id === student.id)
					.map((result) => normalizeResultPercent(result))
					.filter((value): value is number => typeof value === 'number');
			});

			return average(scores);
		})
		.filter((value): value is number => typeof value === 'number');

	const buildClassAnalyticsSummary = (classId: string) => {
		const classStudents = studentsByClass.get(classId) ?? [];
		const classPublishedAssessments = publishedAssessments.filter(
			(assessment) => assessment.class_id === classId
		);

		const studentPublishedAverages = classStudents
			.map((student) => {
				const scores = classPublishedAssessments.flatMap((assessment) =>
					(resultsByAssessmentId.get(assessment.id) ?? [])
						.filter((result) => result.student_id === student.id)
						.map((result) => normalizeResultPercent(result))
						.filter((value): value is number => typeof value === 'number')
				);

				return average(scores);
			})
			.filter((value): value is number => typeof value === 'number');

		return {
			rangeLabel: 'Média por aluno',
			buckets: buildAnalyticsBuckets(studentPublishedAverages)
		};
	};

	const nextAction = actionSteps[0] ?? {
		title: 'Proximo passo',
		text: subjectPerformances[0]
			? `Abra ${subjectPerformances[0].className} para revisar ${subjectPerformances[0].subjectName}.`
			: 'Abra uma turma para seguir com a operacao do professor.',
		href: dashboardClasses[0] ? `/teacher/${dashboardClasses[0].id}` : '/teacher/classes/new',
		priority: 9
	};

	const severityOrder = { critical: 0, attention: 1, setup: 2, healthy: 3 } as const;

	return {
		teacherName: displayName,
		syncLabel: formatRelativeSyncLabel(latestActivityAt),
		actionNow: {
			draftClasses: dashboardClasses.filter((item) => item.draftAssessmentsCount > 0).length,
			belowReferenceSubjects: subjectPerformances.filter((item) =>
				isBelowAttentionThreshold(item.averagePercent)
			).length,
			fallingStudents: fallingStudents.length,
			classesWithoutSubject: dashboardClasses.filter((item) => item.subjectsCount === 0).length,
			nextStepTitle: nextAction.title,
			nextStepText: nextAction.text,
			nextStepHref: nextAction.href
		},
		performanceChanges: {
			belowReferenceSubjects: subjectPerformances
				.filter((item) => isBelowAttentionThreshold(item.averagePercent))
				.slice(0, 3)
				.map((item) => ({
					subjectName: item.subjectName,
					scoreLabel: formatGradeLabel(item.averagePercent),
					helperText:
						item.trendDelta !== null && item.trendDelta < 0
							? `${item.className} - em queda recente`
							: `${item.className} - ${item.assessmentsCount} publicacao(oes)`,
					href: `/teacher/${item.classId}?subjectId=${item.subjectId}`
				})),
			belowReferenceSubjectsHref: subjectPerformances[0]
				? `/teacher/${subjectPerformances[0].classId}?subjectId=${subjectPerformances[0].subjectId}`
				: '/teacher/subjects',
			fallingStudents: fallingStudents.slice(0, 3),
			fallingStudentsHref: fallingStudents[0]?.href ?? '/teacher',
			relevantGaps: relevantGaps.slice(0, 3),
			relevantGapsHref: relevantGaps[0]?.href ?? '/teacher'
		},
		classesSummary: [...dashboardClasses]
			.sort((a, b) => {
				const severityDiff = severityOrder[a.status] - severityOrder[b.status];
				if (severityDiff !== 0) return severityDiff;
				return (classOrderById.get(a.id) ?? 0) - (classOrderById.get(b.id) ?? 0);
			})
			.map((item) => ({
				classId: item.id,
				className: item.name,
				publishedAverageLabel: formatGradeLabel(item.averagePercent),
				coverageLabel: `${item.publishedCoveragePercent}%`,
				trendLabel: formatSignedGradeLabel(item.trendDelta),
				trendTone: trendTone(item.trendDelta),
				tags: (subjectsByClass.get(item.id) ?? [])
					.slice(0, 4)
					.map((subject) => subject.subjectName),
				statusTone: statusTone(item.status),
				openHref: `/teacher/${item.id}`,
				analyticsSummary: buildClassAnalyticsSummary(item.id)
			})),
		analyticsSummary: {
			rangeLabel: 'Ultimos 30 dias',
			buckets: buildAnalyticsBuckets(
				studentAveragesInWindow.length > 0 ? studentAveragesInWindow : fallbackStudentAverages
			)
		},
		error: null
	};
}
