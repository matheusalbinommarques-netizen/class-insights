type CoordMembershipRow = {
	class_id: string;
};

type CoordAccessCodeRow = {
	class_id: string;
	access_code: string;
};

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
	};
	classes: Array<{
		classId: string;
		className: string;
		teacherName: string;
		accessCode: string | null;
		studentsCount: number;
		publishedAssessments: number;
		averagePercent: number | null;
		riskStudents: number;
		tone: 'healthy' | 'attention' | 'critical';
	}>;
	subjects: Array<{
		subjectId: string;
		subjectName: string;
		averagePercent: number | null;
		assessmentsCount: number;
		recentTrend: Trend;
	}>;
	teachers: Array<{
		teacherId: string;
		teacherName: string;
		classesCount: number;
		averagePercent: number | null;
		publishedAssessments: number;
	}>;
	students: Array<{
		studentId: string;
		studentName: string;
		className: string;
		averagePercent: number;
		publishedAssessments: number;
	}>;
};

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizePercent(
	result: Pick<AssessmentResultRow, 'raw_score' | 'score_min' | 'score_max'>
) {
	if (typeof result.raw_score !== 'number') return null;

	const range = result.score_max - result.score_min;
	if (range <= 0) return null;

	return Math.max(0, Math.min(100, ((result.raw_score - result.score_min) / range) * 100));
}

function buildTrend(values: number[]): Trend {
	if (values.length < 2) return 'insufficient_data';

	const midpoint = Math.floor(values.length / 2);
	if (midpoint === 0) return 'insufficient_data';

	const start = average(values.slice(0, midpoint));
	const end = average(values.slice(midpoint));
	if (start === null || end === null) return 'insufficient_data';

	if (end - start >= 5) return 'improving';
	if (start - end >= 5) return 'declining';
	return 'stable';
}

function toneFromMetrics(
	averagePercent: number | null,
	riskStudents: number,
	publishedAssessments: number
) {
	if (
		publishedAssessments === 0 ||
		riskStudents >= 3 ||
		(averagePercent !== null && averagePercent < 55)
	) {
		return 'critical' as const;
	}

	if (riskStudents > 0 || (averagePercent !== null && averagePercent < 70)) {
		return 'attention' as const;
	}

	return 'healthy' as const;
}

export async function loadCoordDashboard(
	locals: App.Locals,
	coordId: string,
	displayName: string
): Promise<{ ok: true; data: CoordDashboardData } | { ok: false; error: string }> {
	const [
		{ data: membershipsData, error: membershipsError },
		{ data: accessCodesData, error: accessCodesError }
	] = await Promise.all([
		locals.supabase.from('coord_class_memberships').select('class_id').eq('coord_id', coordId),
		locals.supabase.from('class_coord_access_codes').select('class_id, access_code')
	]);

	if (membershipsError) {
		return {
			ok: false,
			error: membershipsError.message
		};
	}

	if (accessCodesError) {
		return {
			ok: false,
			error: accessCodesError.message
		};
	}

	const classIds = [
		...new Set(((membershipsData ?? []) as CoordMembershipRow[]).map((item) => item.class_id))
	];
	const accessCodeByClassId = new Map(
		((accessCodesData ?? []) as CoordAccessCodeRow[]).map((item) => [
			item.class_id,
			item.access_code
		])
	);

	if (classIds.length === 0) {
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
					message: 'Cole um codigo de turma para montar o primeiro recorte institucional.'
				},
				classes: [],
				subjects: [],
				teachers: [],
				students: []
			}
		};
	}

	const [classesRes, studentsRes, classSubjectsRes, assessmentsRes] = await Promise.all([
		locals.supabase.rpc('coord_scope_classes'),
		locals.supabase.rpc('coord_scope_students'),
		locals.supabase
			.from('class_subjects')
			.select(
				`
					class_id,
					subject_id,
					subjects (
						name
					)
				`
			)
			.in('class_id', classIds),
		locals.supabase
			.from('assessments')
			.select('id, class_id, subject_id, status, assessment_date')
			.in('class_id', classIds)
			.eq('status', 'published')
	]);

	if (classesRes.error) return { ok: false, error: classesRes.error.message };
	if (studentsRes.error) return { ok: false, error: studentsRes.error.message };
	if (classSubjectsRes.error) return { ok: false, error: classSubjectsRes.error.message };
	if (assessmentsRes.error) return { ok: false, error: assessmentsRes.error.message };

	const classes = ((classesRes.data ?? []) as ClassRow[]).filter((item) =>
		classIds.includes(item.class_id)
	);
	const students = ((studentsRes.data ?? []) as StudentRow[]).filter((item) =>
		classIds.includes(item.class_id)
	);
	const classSubjects = (classSubjectsRes.data ?? []) as SubjectRow[];
	const assessments = (assessmentsRes.data ?? []) as AssessmentRow[];

	const teacherIds = [...new Set(classes.map((item) => item.teacher_id))];
	const assessmentIds = assessments.map((item) => item.id);

	const [, resultsRes] = await Promise.all([
		Promise.resolve({ data: [], error: null }),
		assessmentIds.length > 0
			? locals.supabase
					.from('assessment_results')
					.select('assessment_id, student_id, raw_score, score_min, score_max, is_excused')
					.in('assessment_id', assessmentIds)
			: Promise.resolve({ data: [], error: null })
	]);

	if (resultsRes.error) return { ok: false, error: resultsRes.error.message };

	const results = (resultsRes.data ?? []) as AssessmentResultRow[];

	const studentsByClassId = new Map<string, StudentRow[]>();
	for (const student of students) {
		const current = studentsByClassId.get(student.class_id) ?? [];
		current.push(student);
		studentsByClassId.set(student.class_id, current);
	}

	const resultsByAssessmentId = new Map<string, AssessmentResultRow[]>();
	for (const result of results) {
		const current = resultsByAssessmentId.get(result.assessment_id) ?? [];
		current.push(result);
		resultsByAssessmentId.set(result.assessment_id, current);
	}

	const assessmentsByClassId = new Map<string, AssessmentRow[]>();
	for (const assessment of assessments) {
		const current = assessmentsByClassId.get(assessment.class_id) ?? [];
		current.push(assessment);
		assessmentsByClassId.set(assessment.class_id, current);
	}

	const subjectNameByClassAndId = new Map<string, string>();
	for (const row of classSubjects) {
		const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
		if (!subject) continue;
		subjectNameByClassAndId.set(`${row.class_id}:${row.subject_id}`, subject.name);
	}

	const classCards = classes
		.map((classroom) => {
			const classStudents = studentsByClassId.get(classroom.class_id) ?? [];
			const classAssessments = assessmentsByClassId.get(classroom.class_id) ?? [];
			const normalizedScores = classAssessments.flatMap((assessment) =>
				(resultsByAssessmentId.get(assessment.id) ?? [])
					.filter((result) => !result.is_excused)
					.map((result) => normalizePercent(result))
					.filter((value): value is number => typeof value === 'number')
			);
			const publishedStudentScores = new Map<string, number[]>();

			for (const assessment of classAssessments) {
				for (const result of resultsByAssessmentId.get(assessment.id) ?? []) {
					const normalized = normalizePercent(result);
					if (normalized === null) continue;

					const current = publishedStudentScores.get(result.student_id) ?? [];
					current.push(normalized);
					publishedStudentScores.set(result.student_id, current);
				}
			}

			const riskStudents = [...publishedStudentScores.values()].filter((scores) => {
				const scoreAverage = average(scores);
				return scoreAverage !== null && scoreAverage < 60;
			}).length;

			const averagePercentValue = average(normalizedScores);
			const averagePercent =
				averagePercentValue === null ? null : Math.round(Number(averagePercentValue.toFixed(1)));

			return {
				classId: classroom.class_id,
				className: classroom.class_name,
				teacherName: classroom.teacher_name ?? 'Professor',
				accessCode: classroom.access_code ?? accessCodeByClassId.get(classroom.class_id) ?? null,
				studentsCount: classStudents.length,
				publishedAssessments: classAssessments.length,
				averagePercent,
				riskStudents,
				tone: toneFromMetrics(averagePercent, riskStudents, classAssessments.length)
			};
		})
		.sort((left, right) => {
			const toneRank = { critical: 0, attention: 1, healthy: 2 } as const;
			if (toneRank[left.tone] !== toneRank[right.tone]) {
				return toneRank[left.tone] - toneRank[right.tone];
			}

			const leftAverage =
				typeof left.averagePercent === 'number' ? left.averagePercent : Number.POSITIVE_INFINITY;
			const rightAverage =
				typeof right.averagePercent === 'number' ? right.averagePercent : Number.POSITIVE_INFINITY;
			return leftAverage - rightAverage || left.className.localeCompare(right.className, 'pt-BR');
		});

	const subjects = [...new Set(assessments.map((item) => `${item.class_id}:${item.subject_id}`))]
		.map((key) => {
			const [classId, subjectId] = key.split(':');
			const subjectAssessments = (assessmentsByClassId.get(classId) ?? [])
				.filter((assessment) => assessment.subject_id === subjectId)
				.sort((a, b) => a.assessment_date.localeCompare(b.assessment_date));
			const series = subjectAssessments
				.map((assessment) => {
					const scores = (resultsByAssessmentId.get(assessment.id) ?? [])
						.filter((result) => !result.is_excused)
						.map((result) => normalizePercent(result))
						.filter((value): value is number => typeof value === 'number');
					return average(scores);
				})
				.filter((value): value is number => typeof value === 'number');
			const averagePercentValue = average(series);

			return {
				subjectId: key,
				subjectName: subjectNameByClassAndId.get(key) ?? 'Materia',
				averagePercent:
					averagePercentValue === null ? null : Math.round(Number(averagePercentValue.toFixed(1))),
				assessmentsCount: subjectAssessments.length,
				recentTrend: buildTrend(series)
			};
		})
		.sort((left, right) => {
			const leftAverage =
				typeof left.averagePercent === 'number' ? left.averagePercent : Number.POSITIVE_INFINITY;
			const rightAverage =
				typeof right.averagePercent === 'number' ? right.averagePercent : Number.POSITIVE_INFINITY;
			return (
				leftAverage - rightAverage || left.subjectName.localeCompare(right.subjectName, 'pt-BR')
			);
		})
		.slice(0, 8);

	const teachers = teacherIds
		.map((teacherId) => {
			const teacherClasses = classes.filter((item) => item.teacher_id === teacherId);
			const teacherClassIds = new Set(teacherClasses.map((item) => item.class_id));
			const teacherAssessments = assessments.filter((item) => teacherClassIds.has(item.class_id));
			const teacherScores = teacherAssessments.flatMap((assessment) =>
				(resultsByAssessmentId.get(assessment.id) ?? [])
					.filter((result) => !result.is_excused)
					.map((result) => normalizePercent(result))
					.filter((value): value is number => typeof value === 'number')
			);
			const averagePercentValue = average(teacherScores);

			return {
				teacherId,
				teacherName: teacherClasses[0]?.teacher_name ?? 'Professor',
				classesCount: teacherClasses.length,
				averagePercent:
					averagePercentValue === null ? null : Math.round(Number(averagePercentValue.toFixed(1))),
				publishedAssessments: teacherAssessments.length
			};
		})
		.sort((left, right) => {
			const leftAverage =
				typeof left.averagePercent === 'number' ? left.averagePercent : Number.POSITIVE_INFINITY;
			const rightAverage =
				typeof right.averagePercent === 'number' ? right.averagePercent : Number.POSITIVE_INFINITY;
			return (
				leftAverage - rightAverage || left.teacherName.localeCompare(right.teacherName, 'pt-BR')
			);
		});

	const studentsList = students
		.map((student) => {
			const studentAssessments = assessmentsByClassId.get(student.class_id) ?? [];
			const scores = studentAssessments.flatMap((assessment) =>
				(resultsByAssessmentId.get(assessment.id) ?? [])
					.filter((result) => result.student_id === student.student_id && !result.is_excused)
					.map((result) => normalizePercent(result))
					.filter((value): value is number => typeof value === 'number')
			);
			const averagePercentValue = average(scores);
			if (averagePercentValue === null || averagePercentValue >= 60) return null;

			return {
				studentId: student.student_id,
				studentName: student.student_name,
				className: student.class_name ?? 'Turma',
				averagePercent: Math.round(Number(averagePercentValue.toFixed(1))),
				publishedAssessments: scores.length
			};
		})
		.filter(
			(
				item
			): item is {
				studentId: string;
				studentName: string;
				className: string;
				averagePercent: number;
				publishedAssessments: number;
			} => item !== null
		)
		.sort(
			(left, right) =>
				left.averagePercent - right.averagePercent ||
				left.studentName.localeCompare(right.studentName, 'pt-BR')
		)
		.slice(0, 8);

	const institutionScores = results
		.filter((result) => !result.is_excused)
		.map((result) => normalizePercent(result))
		.filter((value): value is number => typeof value === 'number');
	const institutionAverageValue = average(institutionScores);
	const classesAtRisk = classCards.filter((item) => item.tone !== 'healthy').length;

	return {
		ok: true,
		data: {
			summary: {
				displayName,
				totalClasses: classCards.length,
				totalStudents: students.length,
				totalPublishedAssessments: assessments.length,
				institutionAverage:
					institutionAverageValue === null
						? null
						: Math.round(Number(institutionAverageValue.toFixed(1))),
				classesAtRisk,
				managedClassesCount: classCards.length,
				message:
					classesAtRisk > 0
						? `${classesAtRisk} turma(s) pedem atencao imediata na leitura publicada.`
						: 'Sua coordenacao ja esta lendo somente as turmas sob seu escopo.'
			},
			classes: classCards,
			subjects,
			teachers,
			students: studentsList
		}
	};
}
