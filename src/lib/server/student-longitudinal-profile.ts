import type { StudentLongitudinalSummary } from '$lib/types/academic';
import { buildStudentLongitudinalSummary } from './longitudinal';
import { getSupabaseAdminClient } from './supabase-admin';
import { getOwnedClass } from './teacher';

type StudentRow = {
	id: string;
	name: string;
	class_id: string | null;
	user_id: string | null;
	invite_code: string | null;
};

type ClassRow = {
	id: string;
	name: string;
	score_min: number;
	score_max: number;
	score_decimals: number;
};

type AssessmentRow = {
	id: string;
	subject_id: string;
	title: string;
	assessment_date: string;
	status: 'draft' | 'published';
};

type ResultRow = {
	assessment_id: string;
	student_id: string;
	raw_score: number | null;
	score_min: number;
	score_max: number;
	is_excused: boolean;
};

type SubjectRow = {
	id: string;
	name: string;
	code: string | null;
};

type AssessmentSubjectLookupRow = {
	subject_id: string;
	subjects:
		| {
				id: string;
				name: string;
				code: string | null;
		  }
		| {
				id: string;
				name: string;
				code: string | null;
		  }[]
		| null;
};

export type StudentSubjectStatus = 'good' | 'attention' | 'pending';

export type StudentLongitudinalSubject = {
	id: string;
	name: string;
	code: string | null;
	score: number | null;
	progress: number | null;
	status: StudentSubjectStatus;
	description: string;
	assessmentsCount: number;
	latestAssessmentTitle: string | null;
	latestAssessmentDate: string | null;
	classAverage: number | null;
	gapPercent: number | null;
	recentTrend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
};

export type StudentLongitudinalTimelinePoint = {
	assessmentId: string;
	assessmentTitle: string;
	assessmentDate: string;
	subjectId: string;
	subjectName: string;
	rawScore: number | null;
	studentPercent: number | null;
	classAveragePercent: number | null;
	gapPercent: number | null;
};

export type StudentLongitudinalProfile = {
	student: {
		id: string;
		displayName: string;
		classId: string;
		className: string;
	};
	classroom: ClassRow;
	summary: {
		publishedAssessments: number;
		totalSubjects: number;
		subjectsWithScore: number;
		goodSubjects: number;
		attentionSubjects: number;
		pendingSubjects: number;
		generalAverage: number | null;
		generalPercent: number | null;
		classAveragePercent: number | null;
		gapPercent: number | null;
	};
	bestSubject: StudentLongitudinalSubject | null;
	prioritySubject: StudentLongitudinalSubject | null;
	academicSummary: {
		title: string;
		description: string;
	};
	longitudinal: StudentLongitudinalSummary | null;
	subjects: StudentLongitudinalSubject[];
	timeline: StudentLongitudinalTimelinePoint[];
};

export type StudentLongitudinalAccess =
	| {
			kind: 'student-self';
			authUserId: string;
			fallbackDisplayName: string;
	  }
	| {
			kind: 'teacher';
			teacherUserId: string;
			studentId: string;
	  }
	| {
			kind: 'coord';
			coordId: string;
			studentId: string;
	  };

export type StudentLongitudinalResult =
	| {
			ok: true;
			profile: StudentLongitudinalProfile;
	  }
	| {
			ok: false;
			state: 'pending-link' | 'forbidden' | 'error';
			message: string;
			title: string;
			description: string;
			studentDisplayName: string | null;
	  };

function normalizePercent(rawScore: number | null, min: number, max: number) {
	if (typeof rawScore !== 'number') return null;

	const range = max - min;
	if (range <= 0) return null;

	return Math.max(0, Math.min(100, ((rawScore - min) / range) * 100));
}

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function trendFromSeries(values: number[]) {
	if (values.length < 2) return 'insufficient_data' as const;

	const midpoint = Math.floor(values.length / 2);
	const firstHalf = values.slice(0, midpoint);
	const secondHalf = values.slice(midpoint);
	const start = average(firstHalf);
	const end = average(secondHalf);

	if (start === null || end === null) return 'insufficient_data' as const;
	if (end - start >= 5) return 'improving' as const;
	if (start - end >= 5) return 'declining' as const;
	return 'stable' as const;
}

function statusFromPercent(percent: number): Exclude<StudentSubjectStatus, 'pending'> {
	if (percent >= 70) return 'good';
	return 'attention';
}

function descriptionFromStatus(status: StudentSubjectStatus, progress: number | null): string {
	if (status === 'pending') {
		return 'Ainda nao ha resultado publicado para esta materia.';
	}

	if (status === 'good') {
		return `Voce esta com bom desempenho nesta materia (${progress ?? 0}%).`;
	}

	return `Esta materia pede mais atencao no momento (${progress ?? 0}%).`;
}

async function resolveSubjectsById(
	locals: App.Locals,
	classId: string,
	subjectIds: string[]
): Promise<Map<string, SubjectRow>> {
	const subjectsById = new Map<string, SubjectRow>();
	if (subjectIds.length === 0) return subjectsById;

	const { data: rpcSubjectsData } = await locals.supabase.rpc('get_student_subject_catalog', {
		p_class_id: classId
	});

	if (rpcSubjectsData && Array.isArray(rpcSubjectsData)) {
		for (const subject of rpcSubjectsData as SubjectRow[]) {
			subjectsById.set(subject.id, subject);
		}
	}

	if (subjectsById.size > 0) return subjectsById;

	const { data: subjectsData } = await locals.supabase
		.from('subjects')
		.select('id, name, code')
		.in('id', subjectIds);

	for (const subject of (subjectsData ?? []) as SubjectRow[]) {
		subjectsById.set(subject.id, subject);
	}

	if (subjectsById.size > 0) return subjectsById;

	const { data: assessmentSubjectRows } = await locals.supabase
		.from('assessments')
		.select(
			`
				subject_id,
				subjects (
					id,
					name,
					code
				)
			`
		)
		.eq('class_id', classId)
		.eq('status', 'published');

	for (const row of (assessmentSubjectRows ?? []) as AssessmentSubjectLookupRow[]) {
		const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
		if (!subject) continue;
		subjectsById.set(subject.id, {
			id: subject.id,
			name: subject.name,
			code: subject.code
		});
	}

	if (subjectsById.size > 0) return subjectsById;

	const admin = getSupabaseAdminClient();
	if (!admin) return subjectsById;

	const { data: adminSubjectsData } = await admin
		.from('subjects')
		.select('id, name, code')
		.in('id', subjectIds);

	for (const subject of (adminSubjectsData ?? []) as SubjectRow[]) {
		subjectsById.set(subject.id, subject);
	}

	return subjectsById;
}

function buildAcademicSummary(subjects: StudentLongitudinalSubject[]) {
	const attentionSubjects = subjects.filter((subject) => subject.status === 'attention').length;
	const pendingSubjects = subjects.filter((subject) => subject.status === 'pending').length;

	if (subjects.length === 0) {
		return {
			title: 'Nenhum resultado publicado ainda',
			description:
				'Seu professor ainda nao publicou avaliacoes para esta turma. Assim que isso acontecer, sua visao por materia aparecera aqui.'
		};
	}

	if (pendingSubjects > 0) {
		return {
			title: `${pendingSubjects} materia(s) ainda sem resultado publicado`,
			description:
				'Seu portal agora considera apenas resultados publicados. Algumas materias ainda vao aparecer assim ate o professor fechar as proximas avaliacoes.'
		};
	}

	if (attentionSubjects > 0) {
		return {
			title: `${attentionSubjects} materia(s) pedem mais atencao`,
			description:
				'Seu resultado geral ja esta consolidado no modelo novo. Vale comecar pelas materias com menor desempenho.'
		};
	}

	return {
		title: 'Sem pontos criticos no momento',
		description: 'Seu desempenho publicado esta equilibrado nas materias avaliadas ate aqui.'
	};
}

export async function loadStudentLongitudinalProfile(
	locals: App.Locals,
	access: StudentLongitudinalAccess
): Promise<StudentLongitudinalResult> {
	let student: StudentRow | null = null;
	let fallbackDisplayName: string | null = null;

	if (access.kind === 'student-self') {
		fallbackDisplayName = access.fallbackDisplayName;
		const { data, error } = await locals.supabase
			.from('students')
			.select('id, name, class_id, user_id, invite_code')
			.eq('user_id', access.authUserId)
			.maybeSingle<StudentRow>();

		if (error) {
			return {
				ok: false,
				state: 'pending-link',
				message: error.message,
				title: 'Acesso academico ainda nao concluido',
				description: 'Seu login existe, mas ainda nao foi ligado a um registro academico valido.',
				studentDisplayName: fallbackDisplayName
			};
		}

		student = data;
		if (!student) {
			return {
				ok: false,
				state: 'pending-link',
				message: 'Conta autenticada, mas ainda nao encontramos um aluno vinculado a este usuario.',
				title: 'Conta sem vinculo academico',
				description:
					'Faca login com a conta correta ou conclua o vinculo usando o codigo de convite.',
				studentDisplayName: fallbackDisplayName
			};
		}
	} else {
		const { data, error } = await locals.supabase
			.from('students')
			.select('id, name, class_id, user_id, invite_code')
			.eq('id', access.studentId)
			.maybeSingle<StudentRow>();

		if (error || !data) {
			return {
				ok: false,
				state: 'error',
				message: 'Aluno nao encontrado.',
				title: 'Aluno indisponivel',
				description: 'Nao foi possivel carregar o aluno solicitado.',
				studentDisplayName: null
			};
		}

		student = data;
	}

	const displayName = student.name || fallbackDisplayName || null;
	if (!student.class_id) {
		return {
			ok: false,
			state: access.kind === 'student-self' ? 'pending-link' : 'error',
			message: 'Aluno vinculado sem turma associada.',
			title: 'Turma nao encontrada',
			description:
				'Seu usuario foi ligado a um aluno, mas esse aluno ainda nao possui turma valida.',
			studentDisplayName: displayName
		};
	}

	let classroom: ClassRow | null = null;
	if (access.kind === 'teacher') {
		const ownedClass = await getOwnedClass(locals, student.class_id, access.teacherUserId);
		if (!ownedClass) {
			return {
				ok: false,
				state: 'forbidden',
				message: 'Este aluno nao pertence a uma turma do seu escopo.',
				title: 'Aluno indisponivel',
				description: 'Voce nao tem permissao para ler a trajetoria deste aluno.',
				studentDisplayName: displayName
			};
		}
		classroom = ownedClass;
	} else if (access.kind === 'coord') {
		const { data: membership, error: membershipError } = await locals.supabase
			.from('coord_class_memberships')
			.select('class_id')
			.eq('coord_id', access.coordId)
			.eq('class_id', student.class_id)
			.maybeSingle<{ class_id: string }>();

		if (membershipError || !membership) {
			return {
				ok: false,
				state: 'forbidden',
				message: 'Este aluno nao pertence a uma turma sob seu escopo institucional.',
				title: 'Aluno indisponivel',
				description: 'Voce nao tem permissao para ler a trajetoria deste aluno.',
				studentDisplayName: displayName
			};
		}

		const admin = getSupabaseAdminClient();
		const classQuery = (admin ?? locals.supabase)
			.from('classes')
			.select('id, name, score_min, score_max, score_decimals')
			.eq('id', student.class_id)
			.maybeSingle<ClassRow>();
		const { data, error } = await classQuery;

		if (error || !data) {
			return {
				ok: false,
				state: 'error',
				message: error?.message ?? 'Turma nao encontrada.',
				title: 'Turma indisponivel',
				description: 'Nao foi possivel carregar a turma deste aluno no escopo institucional.',
				studentDisplayName: displayName
			};
		}

		classroom = data;
	} else {
		const { data, error } = await locals.supabase
			.from('classes')
			.select('id, name, score_min, score_max, score_decimals')
			.eq('id', student.class_id)
			.maybeSingle<ClassRow>();

		if (error || !data) {
			return {
				ok: false,
				state: 'pending-link',
				message: error?.message ?? 'Turma nao encontrada.',
				title: 'Turma indisponivel',
				description:
					'Seu vinculo existe, mas nao conseguimos carregar os dados da turma no momento.',
				studentDisplayName: displayName
			};
		}
		classroom = data;
	}

	const { data: assessmentsData, error: assessmentsError } = await locals.supabase
		.from('assessments')
		.select('id, subject_id, title, assessment_date, status')
		.eq('class_id', classroom.id)
		.eq('status', 'published')
		.order('assessment_date', { ascending: true });

	if (assessmentsError) {
		return {
			ok: false,
			state: 'error',
			message: assessmentsError.message,
			title: 'Erro ao carregar avaliacoes',
			description: 'Nao foi possivel montar a leitura publicada deste aluno.',
			studentDisplayName: displayName
		};
	}

	const assessments = (assessmentsData ?? []) as AssessmentRow[];
	const assessmentIds = assessments.map((assessment) => assessment.id);
	const subjectIds = [...new Set(assessments.map((assessment) => assessment.subject_id))];
	const subjectsById = await resolveSubjectsById(locals, classroom.id, subjectIds);

	let results: ResultRow[] = [];
	if (assessmentIds.length > 0) {
		const { data: resultsData, error: resultsError } = await locals.supabase
			.from('assessment_results')
			.select('assessment_id, student_id, raw_score, score_min, score_max, is_excused')
			.in('assessment_id', assessmentIds);

		if (resultsError) {
			return {
				ok: false,
				state: 'error',
				message: resultsError.message,
				title: 'Resultados indisponiveis',
				description: 'Nao foi possivel carregar os resultados publicados do aluno.',
				studentDisplayName: displayName
			};
		}

		results = (resultsData ?? []) as ResultRow[];
	}

	const studentResultByAssessmentId = new Map(
		results
			.filter((result) => result.student_id === student.id)
			.map((result) => [result.assessment_id, result])
	);

	const classNormalizedScoresByAssessmentId = new Map<string, number[]>();
	for (const result of results) {
		if (result.is_excused) continue;
		const normalized = normalizePercent(result.raw_score, result.score_min, result.score_max);
		if (normalized === null) continue;

		const current = classNormalizedScoresByAssessmentId.get(result.assessment_id) ?? [];
		current.push(normalized);
		classNormalizedScoresByAssessmentId.set(result.assessment_id, current);
	}

	const timeline: StudentLongitudinalTimelinePoint[] = assessments.map((assessment) => {
		const result = studentResultByAssessmentId.get(assessment.id);
		const subject = subjectsById.get(assessment.subject_id);
		const studentPercent = normalizePercent(
			result?.raw_score ?? null,
			result?.score_min ?? classroom.score_min,
			result?.score_max ?? classroom.score_max
		);
		const classAveragePercent = average(
			classNormalizedScoresByAssessmentId.get(assessment.id) ?? []
		);
		const roundedStudentPercent =
			studentPercent === null ? null : Math.round(Number(studentPercent.toFixed(1)));
		const roundedClassAveragePercent =
			classAveragePercent === null ? null : Math.round(Number(classAveragePercent.toFixed(1)));

		return {
			assessmentId: assessment.id,
			assessmentTitle: assessment.title,
			assessmentDate: assessment.assessment_date,
			subjectId: assessment.subject_id,
			subjectName: subject?.name ?? 'Materia',
			rawScore: result?.raw_score ?? null,
			studentPercent: roundedStudentPercent,
			classAveragePercent: roundedClassAveragePercent,
			gapPercent:
				roundedStudentPercent === null || roundedClassAveragePercent === null
					? null
					: Number((roundedStudentPercent - roundedClassAveragePercent).toFixed(1))
		};
	});

	const longitudinal =
		timeline.length > 0 && displayName
			? buildStudentLongitudinalSummary({
					student_id: student.id,
					student_name: displayName,
					timeline: timeline.map((point) => ({
						assessment_id: point.assessmentId,
						assessment_title: point.assessmentTitle,
						assessment_date: point.assessmentDate,
						subject_id: point.subjectId,
						subject_name: point.subjectName,
						raw_score: point.rawScore,
						normalized_percent: point.studentPercent,
						status: 'published'
					}))
				})
			: null;

	const subjects = [...new Set(timeline.map((point) => point.subjectId))]
		.map((subjectId) => {
			const points = timeline.filter((point) => point.subjectId === subjectId);
			const studentSeries = points
				.map((point) => point.studentPercent)
				.filter((value): value is number => typeof value === 'number');
			const classSeries = points
				.map((point) => point.classAveragePercent)
				.filter((value): value is number => typeof value === 'number');
			const studentAverageValue = average(studentSeries);
			const classAverageValue = average(classSeries);
			const progress =
				studentAverageValue === null ? null : Math.round(Number(studentAverageValue.toFixed(1)));
			const classAverage =
				classAverageValue === null ? null : Math.round(Number(classAverageValue.toFixed(1)));
			const latestPoint = [...points].sort((a, b) =>
				b.assessmentDate.localeCompare(a.assessmentDate)
			)[0];

			if (progress === null) {
				return {
					id: subjectId,
					name: latestPoint?.subjectName ?? 'Materia',
					code: subjectsById.get(subjectId)?.code ?? null,
					score: null,
					progress: null,
					status: 'pending' as const,
					description: descriptionFromStatus('pending', null),
					assessmentsCount: points.length,
					latestAssessmentTitle: latestPoint?.assessmentTitle ?? null,
					latestAssessmentDate: latestPoint?.assessmentDate ?? null,
					classAverage,
					gapPercent: null,
					recentTrend: trendFromSeries(studentSeries)
				};
			}

			const status = statusFromPercent(progress);
			return {
				id: subjectId,
				name: latestPoint?.subjectName ?? 'Materia',
				code: subjectsById.get(subjectId)?.code ?? null,
				score: progress,
				progress,
				status,
				description: descriptionFromStatus(status, progress),
				assessmentsCount: points.length,
				latestAssessmentTitle: latestPoint?.assessmentTitle ?? null,
				latestAssessmentDate: latestPoint?.assessmentDate ?? null,
				classAverage,
				gapPercent:
					progress === null || classAverage === null
						? null
						: Number((progress - classAverage).toFixed(1)),
				recentTrend: trendFromSeries(studentSeries)
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

	const scoredSubjects = subjects.filter(
		(subject) => typeof subject.score === 'number' && typeof subject.progress === 'number'
	);
	const studentScores = timeline
		.map((point) => point.studentPercent)
		.filter((value): value is number => typeof value === 'number');
	const classScores = timeline
		.map((point) => point.classAveragePercent)
		.filter((value): value is number => typeof value === 'number');
	const generalAverageValue = average(scoredSubjects.map((subject) => subject.score as number));
	const generalAverage =
		generalAverageValue !== null
			? Number(generalAverageValue.toFixed(classroom.score_decimals))
			: null;
	const generalPercent =
		scoredSubjects.length > 0
			? Math.round(average(scoredSubjects.map((subject) => subject.progress as number)) ?? 0)
			: null;
	const classAveragePercentValue = average(classScores);
	const classAveragePercent =
		classAveragePercentValue === null
			? null
			: Math.round(Number(classAveragePercentValue.toFixed(1)));
	const studentAveragePercentValue = average(studentScores);
	const gapPercent =
		studentAveragePercentValue === null || classAveragePercentValue === null
			? null
			: Number((studentAveragePercentValue - classAveragePercentValue).toFixed(1));
	const goodSubjects = subjects.filter((subject) => subject.status === 'good').length;
	const attentionSubjects = subjects.filter((subject) => subject.status === 'attention').length;
	const pendingSubjects = subjects.filter((subject) => subject.status === 'pending').length;
	const bestSubject =
		[...scoredSubjects].sort((a, b) => (b.progress as number) - (a.progress as number))[0] ?? null;
	const prioritySubject =
		[...scoredSubjects].sort((a, b) => (a.progress as number) - (b.progress as number))[0] ??
		subjects.find((subject) => subject.status === 'pending') ??
		null;

	return {
		ok: true,
		profile: {
			student: {
				id: student.id,
				displayName: displayName ?? 'Aluno',
				classId: classroom.id,
				className: classroom.name
			},
			classroom,
			summary: {
				publishedAssessments: timeline.length,
				totalSubjects: subjects.length,
				subjectsWithScore: scoredSubjects.length,
				goodSubjects,
				attentionSubjects,
				pendingSubjects,
				generalAverage,
				generalPercent,
				classAveragePercent,
				gapPercent
			},
			bestSubject,
			prioritySubject,
			academicSummary: buildAcademicSummary(subjects),
			longitudinal,
			subjects,
			timeline: [...timeline].sort((a, b) => b.assessmentDate.localeCompare(a.assessmentDate))
		}
	};
}
