type ClassRow = {
	class_id: string;
	class_name: string;
	teacher_id: string;
	teacher_name: string;
	access_code: string | null;
};

type StudentRow = {
	student_id: string;
	student_name: string;
	class_id: string;
	class_name: string;
};

type SubjectRow = {
	class_id: string;
	subject_id: string;
	subjects:
		| {
				name: string;
		  }
		| {
				name: string;
		  }[]
		| null;
};

type AssessmentRow = {
	id: string;
	class_id: string;
	subject_id: string;
	status: 'draft' | 'published';
	assessment_date: string;
};

type AssessmentResultRow = {
	assessment_id: string;
	student_id: string;
	raw_score: number | null;
	score_min: number;
	score_max: number;
	is_excused: boolean;
};

type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';
type CoordTone = 'healthy' | 'attention' | 'critical';
type SummaryTone = 'default' | 'attention' | 'critical';

type CoordSummaryHighlight = {
	key: string;
	label: string;
	value: string;
	description: string;
	tone: SummaryTone;
};

type CoordClassDashboardItem = {
	classId: string;
	className: string;
	teacherId: string;
	teacherName: string;
	accessCode: string | null;
	studentsCount: number;
	publishedAssessments: number;
	averagePercent: number | null;
	riskStudents: number;
	tone: CoordTone;
	priorityScore: number;
	coveragePercent: number;
	lastPublishedAt: string | null;
	primaryReason: string;
	detailHref: string;
};

type CoordSubjectDashboardItem = {
	subjectId: string;
	subjectName: string;
	averagePercent: number | null;
	assessmentsCount: number;
	recentTrend: Trend;
	priorityScore: number;
	coveragePercent: number;
	lastPublishedAt: string | null;
	primaryReason: string;
	detailHref: string;
};

type CoordTeacherDashboardItem = {
	teacherId: string;
	teacherName: string;
	classesCount: number;
	averagePercent: number | null;
	publishedAssessments: number;
	priorityScore: number;
	coveragePercent: number;
	lastPublishedAt: string | null;
	primaryReason: string;
	detailHref: string;
};

type CoordStudentDashboardItem = {
	studentId: string;
	studentName: string;
	className: string;
	averagePercent: number;
	publishedAssessments: number;
	priorityScore: number;
	primaryReason: string;
	detailHref: string;
};

export type CoordDashboardData = {
	summary: {
		displayName: string;
		totalClasses: number;
		totalStudents: number;
		totalPublishedAssessments: number;
		institutionAverage: number | null;
		classesAtRisk: number;
		managedClassesCount: number;
		message: string;
		highlights: CoordSummaryHighlight[];
	};
	classes: CoordClassDashboardItem[];
	subjects: CoordSubjectDashboardItem[];
	teachers: CoordTeacherDashboardItem[];
	students: CoordStudentDashboardItem[];
};

export type CoordDashboardResult =
	| {
			ok: true;
			data: CoordDashboardData;
	  }
	| {
			ok: false;
			error: string;
	  };

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizePercent(
	result: Pick<AssessmentResultRow, 'raw_score' | 'score_min' | 'score_max'>
): number | null {
	if (typeof result.raw_score !== 'number') return null;

	const range = result.score_max - result.score_min;
	if (range <= 0) return null;

	return ((result.raw_score - result.score_min) / range) * 100;
}

function extractSubjectName(input: SubjectRow['subjects']): string {
	if (!input) return 'Materia';
	return Array.isArray(input) ? (input[0]?.name ?? 'Materia') : input.name;
}

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

function classifyClassTone(input: {
	studentsCount: number;
	publishedAssessments: number;
	averagePercent: number | null;
	riskStudents: number;
}): CoordTone {
	if (input.studentsCount === 0) return 'attention';

	if (input.publishedAssessments === 0) return 'critical';

	if (
		input.riskStudents >= Math.max(2, Math.ceil(input.studentsCount * 0.25)) ||
		(typeof input.averagePercent === 'number' && input.averagePercent < 50)
	) {
		return 'critical';
	}

	if (
		input.riskStudents > 0 ||
		(typeof input.averagePercent === 'number' && input.averagePercent < 70)
	) {
		return 'attention';
	}

	return 'healthy';
}

function classifyTrend(
	series: Array<{ assessmentDate: string; averagePercent: number | null }>
): Trend {
	const valid = series
		.filter((item) => typeof item.averagePercent === 'number')
		.sort((left, right) => left.assessmentDate.localeCompare(right.assessmentDate));

	if (valid.length < 2) return 'insufficient_data';

	const firstHalf = valid.slice(0, Math.ceil(valid.length / 2));
	const secondHalf = valid.slice(Math.floor(valid.length / 2));

	const firstAverage = average(firstHalf.map((item) => item.averagePercent ?? 0));
	const secondAverage = average(secondHalf.map((item) => item.averagePercent ?? 0));

	if (typeof firstAverage !== 'number' || typeof secondAverage !== 'number') {
		return 'insufficient_data';
	}

	const delta = secondAverage - firstAverage;

	if (delta >= 5) return 'improving';
	if (delta <= -5) return 'declining';
	return 'stable';
}

function buildClassReason(input: {
	publishedAssessments: number;
	riskStudents: number;
	averagePercent: number | null;
	tone: CoordTone;
}): string {
	if (input.publishedAssessments === 0) {
		return 'A turma ainda nao possui publicacoes suficientes para leitura institucional.';
	}

	if (input.tone === 'critical') {
		if (input.riskStudents > 0) {
			return `${input.riskStudents} aluno(s) aparecem em risco neste recorte.`;
		}

		return 'A media publicada da turma caiu para nivel critico.';
	}

	if (input.tone === 'attention') {
		return 'A turma pede acompanhamento mais proximo pela media ou pela presenca de alunos em atencao.';
	}

	return 'A turma esta dentro do esperado neste momento.';
}

function buildSubjectReason(input: {
	recentTrend: Trend;
	averagePercent: number | null;
	assessmentsCount: number;
}): string {
	if (input.assessmentsCount === 0) {
		return 'A materia ainda nao possui publicacoes suficientes para leitura.';
	}

	if (input.recentTrend === 'declining') {
		return 'A materia mostra tendencia recente de queda no escopo atual.';
	}

	if (typeof input.averagePercent === 'number' && input.averagePercent < 60) {
		return 'A media publicada da materia esta abaixo do esperado.';
	}

	if (input.recentTrend === 'improving') {
		return 'A materia mostra melhora recente no escopo atual.';
	}

	return 'A materia esta estavel no recorte atual.';
}

function buildTeacherReason(input: {
	classesCount: number;
	publishedAssessments: number;
	averagePercent: number | null;
}): string {
	if (input.publishedAssessments === 0) {
		return 'Ainda nao ha publicacoes suficientes para leitura institucional desse professor.';
	}

	if (typeof input.averagePercent === 'number' && input.averagePercent < 60) {
		return 'As turmas desse professor concentram media institucional abaixo do esperado.';
	}

	return `${input.classesCount} turma(s) compoem o recorte atual desse professor.`;
}

function buildStudentReason(input: {
	averagePercent: number;
	publishedAssessments: number;
}): string {
	if (input.averagePercent < 50) {
		return 'O aluno entra como prioridade alta pela media publicada atual.';
	}

	if (input.averagePercent < 70) {
		return 'O aluno merece acompanhamento por estar abaixo da faixa esperada.';
	}

	return `Base em ${input.publishedAssessments} publicacao(oes) no recorte atual.`;
}

function sortByPriority<
	T extends { priorityScore: number; averagePercent?: number | null; averagePercentValue?: number }
>(items: T[]): T[] {
	return [...items].sort((left, right) => {
		if (right.priorityScore !== left.priorityScore) {
			return right.priorityScore - left.priorityScore;
		}

		const leftValue =
			typeof left.averagePercentValue === 'number'
				? left.averagePercentValue
				: typeof left.averagePercent === 'number'
					? left.averagePercent
					: 999;

		const rightValue =
			typeof right.averagePercentValue === 'number'
				? right.averagePercentValue
				: typeof right.averagePercent === 'number'
					? right.averagePercent
					: 999;

		return leftValue - rightValue;
	});
}

export async function loadCoordDashboard(
	locals: App.Locals,
	_coordUserId: string,
	displayName: string
): Promise<CoordDashboardResult> {
	const { data: classesData, error: classesError } =
		await locals.supabase.rpc('coord_scope_classes');

	if (classesError) {
		return {
			ok: false,
			error: 'Nao foi possivel carregar o escopo institucional da coordenacao.'
		};
	}

	const classes = (classesData ?? []) as ClassRow[];

	if (classes.length === 0) {
		return {
			ok: true,
			data: {
				summary: {
					displayName,
					totalClasses: 0,
					totalStudents: 0,
					totalPublishedAssessments: 0,
					institutionAverage: null,
					classesAtRisk: 0,
					managedClassesCount: 0,
					message: 'Adicione um codigo de turma para montar seu primeiro recorte institucional.',
					highlights: [
						{
							key: 'scope',
							label: 'Escopo',
							value: '0 turmas',
							description: 'Nenhuma turma vinculada ao painel ainda.',
							tone: 'default'
						}
					]
				},
				classes: [],
				subjects: [],
				teachers: [],
				students: []
			}
		};
	}

	const classIds = unique(classes.map((item) => item.class_id));

	const { data: studentsData, error: studentsError } = await locals.supabase
		.from('students')
		.select('id, name, class_id, classes(name)')
		.in('class_id', classIds);

	if (studentsError) {
		return {
			ok: false,
			error: 'Nao foi possivel carregar os alunos do escopo institucional.'
		};
	}

	const students = (
		(studentsData ?? []) as Array<{
			id: string;
			name: string;
			class_id: string;
			classes: { name: string } | { name: string }[] | null;
		}>
	).map<StudentRow>((row) => ({
		student_id: row.id,
		student_name: row.name,
		class_id: row.class_id,
		class_name: Array.isArray(row.classes)
			? (row.classes[0]?.name ?? 'Turma')
			: (row.classes?.name ?? 'Turma')
	}));

	const { data: subjectsData, error: subjectsError } = await locals.supabase
		.from('class_subjects')
		.select('class_id, subject_id, subjects(name)')
		.in('class_id', classIds);

	if (subjectsError) {
		return {
			ok: false,
			error: 'Nao foi possivel carregar as materias do escopo institucional.'
		};
	}

	const subjects = (subjectsData ?? []) as SubjectRow[];

	const { data: assessmentsData, error: assessmentsError } = await locals.supabase
		.from('assessments')
		.select('id, class_id, subject_id, status, assessment_date')
		.in('class_id', classIds);

	if (assessmentsError) {
		return {
			ok: false,
			error: 'Nao foi possivel carregar as avaliacoes do escopo institucional.'
		};
	}

	const assessments = (assessmentsData ?? []) as AssessmentRow[];
	const publishedAssessments = assessments.filter((item) => item.status === 'published');
	const publishedAssessmentIds = publishedAssessments.map((item) => item.id);

	let results: AssessmentResultRow[] = [];

	if (publishedAssessmentIds.length > 0) {
		const { data: resultsData, error: resultsError } = await locals.supabase
			.from('assessment_results')
			.select('assessment_id, student_id, raw_score, score_min, score_max, is_excused')
			.in('assessment_id', publishedAssessmentIds);

		if (resultsError) {
			return {
				ok: false,
				error: 'Nao foi possivel carregar os resultados publicados do escopo institucional.'
			};
		}

		results = (resultsData ?? []) as AssessmentResultRow[];
	}

	const studentsByClassId = new Map<string, StudentRow[]>();
	for (const student of students) {
		const bucket = studentsByClassId.get(student.class_id) ?? [];
		bucket.push(student);
		studentsByClassId.set(student.class_id, bucket);
	}

	const publishedAssessmentsByClassId = new Map<string, AssessmentRow[]>();
	for (const assessment of publishedAssessments) {
		const bucket = publishedAssessmentsByClassId.get(assessment.class_id) ?? [];
		bucket.push(assessment);
		publishedAssessmentsByClassId.set(assessment.class_id, bucket);
	}

	const resultsByAssessmentId = new Map<string, AssessmentResultRow[]>();
	for (const result of results) {
		const bucket = resultsByAssessmentId.get(result.assessment_id) ?? [];
		bucket.push(result);
		resultsByAssessmentId.set(result.assessment_id, bucket);
	}

	const classDashboardItems = classes.map<CoordClassDashboardItem>((classRow) => {
		const classStudents = studentsByClassId.get(classRow.class_id) ?? [];
		const classAssessments = publishedAssessmentsByClassId.get(classRow.class_id) ?? [];
		const classResults = classAssessments.flatMap(
			(assessment) => resultsByAssessmentId.get(assessment.id) ?? []
		);

		const normalizedScores = classResults
			.filter((result) => !result.is_excused)
			.map((result) => normalizePercent(result))
			.filter((value): value is number => typeof value === 'number');

		const studentAverageById = new Map<string, number>();
		for (const student of classStudents) {
			const studentScores = classResults
				.filter((result) => result.student_id === student.student_id && !result.is_excused)
				.map((result) => normalizePercent(result))
				.filter((value): value is number => typeof value === 'number');

			const studentAverage = average(studentScores);
			if (typeof studentAverage === 'number') {
				studentAverageById.set(student.student_id, studentAverage);
			}
		}

		const averagePercent = average(normalizedScores);
		const riskStudents = [...studentAverageById.values()].filter((value) => value < 60).length;
		const publishedAssessmentsCount = classAssessments.length;
		const studentsCount = classStudents.length;
		const tone = classifyClassTone({
			studentsCount,
			publishedAssessments: publishedAssessmentsCount,
			averagePercent,
			riskStudents
		});

		const totalExpectedResults = publishedAssessmentsCount * Math.max(studentsCount, 1);
		const coveragePercent =
			totalExpectedResults > 0 ? (classResults.length / totalExpectedResults) * 100 : 0;

		const lastPublishedAt =
			classAssessments
				.map((item) => item.assessment_date)
				.sort((left, right) => right.localeCompare(left))[0] ?? null;

		const priorityScore =
			(tone === 'critical' ? 320 : tone === 'attention' ? 180 : 80) +
			riskStudents * 10 +
			Math.round((100 - (averagePercent ?? 100)) * 1.5) +
			Math.round((100 - coveragePercent) * 0.5);

		return {
			classId: classRow.class_id,
			className: classRow.class_name,
			teacherId: classRow.teacher_id,
			teacherName: classRow.teacher_name,
			accessCode: classRow.access_code,
			studentsCount,
			publishedAssessments: publishedAssessmentsCount,
			averagePercent,
			riskStudents,
			tone,
			priorityScore,
			coveragePercent,
			lastPublishedAt,
			primaryReason: buildClassReason({
				publishedAssessments: publishedAssessmentsCount,
				riskStudents,
				averagePercent,
				tone
			}),
			detailHref: `/coord/classes/${classRow.class_id}`
		};
	});

	const subjectNameById = new Map<string, string>();
	const classIdsBySubjectId = new Map<string, string[]>();

	for (const subjectRow of subjects) {
		subjectNameById.set(subjectRow.subject_id, extractSubjectName(subjectRow.subjects));

		const bucket = classIdsBySubjectId.get(subjectRow.subject_id) ?? [];
		bucket.push(subjectRow.class_id);
		classIdsBySubjectId.set(subjectRow.subject_id, unique(bucket));
	}

	const subjectDashboardItems = unique(
		subjects.map((item) => item.subject_id)
	).map<CoordSubjectDashboardItem>((subjectId) => {
		const relatedAssessments = publishedAssessments.filter((item) => item.subject_id === subjectId);
		const relatedResults = relatedAssessments.flatMap(
			(assessment) => resultsByAssessmentId.get(assessment.id) ?? []
		);

		const normalizedScores = relatedResults
			.filter((result) => !result.is_excused)
			.map((result) => normalizePercent(result))
			.filter((value): value is number => typeof value === 'number');

		const averagePercent = average(normalizedScores);

		const trendSeries = relatedAssessments.map((assessment) => {
			const assessmentScores = (resultsByAssessmentId.get(assessment.id) ?? [])
				.filter((result) => !result.is_excused)
				.map((result) => normalizePercent(result))
				.filter((value): value is number => typeof value === 'number');

			return {
				assessmentDate: assessment.assessment_date,
				averagePercent: average(assessmentScores)
			};
		});

		const recentTrend = classifyTrend(trendSeries);
		const relatedClassIds = classIdsBySubjectId.get(subjectId) ?? [];
		const coverageBase = relatedClassIds.length * Math.max(relatedAssessments.length, 1);
		const coveragePercent =
			coverageBase > 0 ? Math.min(100, (relatedAssessments.length / coverageBase) * 100) : 0;

		const lastPublishedAt =
			relatedAssessments
				.map((item) => item.assessment_date)
				.sort((left, right) => right.localeCompare(left))[0] ?? null;

		const priorityScore =
			(recentTrend === 'declining' ? 150 : recentTrend === 'stable' ? 40 : 20) +
			Math.round((100 - (averagePercent ?? 100)) * 1.4) +
			relatedAssessments.length * 2;

		return {
			subjectId,
			subjectName: subjectNameById.get(subjectId) ?? 'Materia',
			averagePercent,
			assessmentsCount: relatedAssessments.length,
			recentTrend,
			priorityScore,
			coveragePercent,
			lastPublishedAt,
			primaryReason: buildSubjectReason({
				recentTrend,
				averagePercent,
				assessmentsCount: relatedAssessments.length
			}),
			detailHref: `/coord/subjects/${subjectId}`
		};
	});

	const teacherDashboardItems = unique(
		classes.map((item) => item.teacher_id)
	).map<CoordTeacherDashboardItem>((teacherId) => {
		const teacherClasses = classDashboardItems.filter((item) => item.teacherId === teacherId);
		const averagePercent = average(
			teacherClasses
				.map((item) => item.averagePercent)
				.filter((value): value is number => typeof value === 'number')
		);

		const publishedAssessmentsCount = teacherClasses.reduce(
			(sum, item) => sum + item.publishedAssessments,
			0
		);

		const coveragePercent = average(teacherClasses.map((item) => item.coveragePercent)) ?? 0;
		const lastPublishedAt =
			teacherClasses
				.map((item) => item.lastPublishedAt)
				.filter((value): value is string => typeof value === 'string')
				.sort((left, right) => right.localeCompare(left))[0] ?? null;

		const classesAtRisk = teacherClasses.filter((item) => item.tone !== 'healthy').length;

		const priorityScore =
			classesAtRisk * 90 +
			Math.round((100 - (averagePercent ?? 100)) * 1.2) +
			Math.round((100 - coveragePercent) * 0.5);

		return {
			teacherId,
			teacherName: teacherClasses[0]?.teacherName ?? 'Professor',
			classesCount: teacherClasses.length,
			averagePercent,
			publishedAssessments: publishedAssessmentsCount,
			priorityScore,
			coveragePercent,
			lastPublishedAt,
			primaryReason: buildTeacherReason({
				classesCount: teacherClasses.length,
				publishedAssessments: publishedAssessmentsCount,
				averagePercent
			}),
			detailHref: `/coord/teachers/${teacherId}`
		};
	});

	const studentDashboardItems = students
		.map<CoordStudentDashboardItem | null>((student) => {
			const studentResults = results
				.filter((result) => result.student_id === student.student_id && !result.is_excused)
				.map((result) => normalizePercent(result))
				.filter((value): value is number => typeof value === 'number');

			const averagePercent = average(studentResults);
			if (typeof averagePercent !== 'number') {
				return null;
			}

			const publishedAssessmentsCount = unique(
				results
					.filter((result) => result.student_id === student.student_id)
					.map((result) => result.assessment_id)
			).length;

			const priorityScore =
				Math.round((100 - averagePercent) * 2.2) + publishedAssessmentsCount * 5;

			return {
				studentId: student.student_id,
				studentName: student.student_name,
				className: student.class_name,
				averagePercent,
				publishedAssessments: publishedAssessmentsCount,
				priorityScore,
				primaryReason: buildStudentReason({
					averagePercent,
					publishedAssessments: publishedAssessmentsCount
				}),
				detailHref: `/coord/students/${student.student_id}`
			};
		})
		.filter((item): item is CoordStudentDashboardItem => item !== null);

	const sortedClasses = sortByPriority(classDashboardItems);
	const sortedSubjects = sortByPriority(subjectDashboardItems);
	const sortedTeachers = sortByPriority(teacherDashboardItems);
	const sortedStudents = sortByPriority(studentDashboardItems);

	const institutionAverage = average(
		sortedClasses
			.map((item) => item.averagePercent)
			.filter((value): value is number => typeof value === 'number')
	);

	const classesAtRisk = sortedClasses.filter((item) => item.tone !== 'healthy').length;
	const totalPublishedAssessments = publishedAssessments.length;

	const highlights: CoordSummaryHighlight[] = [
		{
			key: 'critical-classes',
			label: 'Turmas prioritarias',
			value: `${sortedClasses.filter((item) => item.tone === 'critical').length}`,
			description: 'Turmas em nivel critico no escopo atual.',
			tone: sortedClasses.some((item) => item.tone === 'critical') ? 'critical' : 'default'
		},
		{
			key: 'declining-subjects',
			label: 'Materias em queda',
			value: `${sortedSubjects.filter((item) => item.recentTrend === 'declining').length}`,
			description: 'Materias com tendencia recente de piora.',
			tone: sortedSubjects.some((item) => item.recentTrend === 'declining')
				? 'attention'
				: 'default'
		},
		{
			key: 'priority-students',
			label: 'Alunos prioritarios',
			value: `${sortedStudents.filter((item) => item.averagePercent < 60).length}`,
			description: 'Alunos abaixo da faixa esperada.',
			tone: sortedStudents.some((item) => item.averagePercent < 50) ? 'attention' : 'default'
		}
	];

	return {
		ok: true,
		data: {
			summary: {
				displayName,
				totalClasses: classes.length,
				totalStudents: students.length,
				totalPublishedAssessments,
				institutionAverage,
				classesAtRisk,
				managedClassesCount: classes.length,
				message:
					totalPublishedAssessments > 0
						? 'A leitura institucional abaixo considera apenas resultados publicados no seu escopo atual.'
						: 'Seu escopo ja esta vinculado, mas ainda nao ha publicacoes suficientes para leitura institucional.',
				highlights
			},
			classes: sortedClasses,
			subjects: sortedSubjects,
			teachers: sortedTeachers,
			students: sortedStudents
		}
	};
}
