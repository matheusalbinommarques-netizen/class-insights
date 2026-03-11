import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { resolveEffectiveScale } from '$lib/server/scoring';

type ParentData = {
	authUser: {
		id: string;
		email: string | null;
	};
	profile: {
		id: string;
		role: 'teacher' | 'student' | 'coord';
		display_name: string;
	};
};

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

type SkillRow = {
	id: string;
	name: string;
	score_min: number | null;
	score_max: number | null;
	score_decimals: number | null;
};

type ScoreRow = {
	skill_id: string;
	score: number;
};

type SubjectStatus = 'good' | 'attention' | 'pending';

type SubjectCard = {
	subjectId: string;
	subjectName: string;
	score: number | null;
	progress: number | null;
	status: SubjectStatus;
	description: string;
};

function ratioToPercent(value: number, min: number, max: number): number {
	const range = max - min;
	if (range <= 0) return 0;

	const ratio = (value - min) / range;
	return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}

function statusFromPercent(percent: number): Exclude<SubjectStatus, 'pending'> {
	if (percent >= 70) return 'good';
	return 'attention';
}

function descriptionFromStatus(status: SubjectStatus, progress: number | null): string {
	if (status === 'pending') {
		return 'Ainda não há nota lançada para esta matéria.';
	}

	if (status === 'good') {
		return `Você está com bom desempenho nesta matéria (${progress ?? 0}%).`;
	}

	return `Esta matéria pede mais atenção no momento (${progress ?? 0}%).`;
}

export const load: PageServerLoad = async ({ locals, parent }) => {
	const parentData = (await parent()) as ParentData;
	const authUser = parentData.authUser;
	const profile = parentData.profile;

	if (!authUser?.id) {
		throw redirect(302, '/login');
	}

	const { data: student, error: studentError } = await locals.supabase
		.from('students')
		.select('id, name, class_id, user_id, invite_code')
		.eq('user_id', authUser.id)
		.maybeSingle<StudentRow>();

	if (studentError) {
		return {
			authUser,
			portal: {
				status: 'pending-link' as const,
				message: studentError.message
			},
			summary: {
				studentName: profile.display_name,
				className: null as string | null,
				totalSubjects: 0,
				subjectsWithScore: 0,
				goodSubjects: 0,
				attentionSubjects: 0,
				pendingSubjects: 0,
				generalAverage: null as number | null,
				generalPercent: null as number | null
			},
			bestSubject: null as SubjectCard | null,
			prioritySubject: null as SubjectCard | null,
			subjects: [] as SubjectCard[],
			academicSummary: {
				title: 'Acesso acadêmico ainda não concluído',
				description:
					'Seu login existe, mas ainda não foi ligado a um registro acadêmico válido.'
			}
		};
	}

	if (!student) {
		return {
			authUser,
			portal: {
				status: 'pending-link' as const,
				message:
					'Conta autenticada, mas ainda não encontramos um aluno vinculado a este usuário.'
			},
			summary: {
				studentName: profile.display_name,
				className: null as string | null,
				totalSubjects: 0,
				subjectsWithScore: 0,
				goodSubjects: 0,
				attentionSubjects: 0,
				pendingSubjects: 0,
				generalAverage: null as number | null,
				generalPercent: null as number | null
			},
			bestSubject: null as SubjectCard | null,
			prioritySubject: null as SubjectCard | null,
			subjects: [] as SubjectCard[],
			academicSummary: {
				title: 'Conta sem vínculo acadêmico',
				description:
					'Faça login com a conta correta ou conclua o vínculo usando o código de convite.'
			}
		};
	}

	if (!student.class_id) {
		return {
			authUser,
			portal: {
				status: 'pending-link' as const,
				message: 'Aluno vinculado sem turma associada.'
			},
			summary: {
				studentName: student.name || profile.display_name,
				className: null as string | null,
				totalSubjects: 0,
				subjectsWithScore: 0,
				goodSubjects: 0,
				attentionSubjects: 0,
				pendingSubjects: 0,
				generalAverage: null as number | null,
				generalPercent: null as number | null
			},
			bestSubject: null as SubjectCard | null,
			prioritySubject: null as SubjectCard | null,
			subjects: [] as SubjectCard[],
			academicSummary: {
				title: 'Turma não encontrada',
				description:
					'Seu usuário foi ligado a um aluno, mas esse aluno ainda não possui turma válida.'
			}
		};
	}

	const { data: classData, error: classError } = await locals.supabase
		.from('classes')
		.select('id, name, score_min, score_max, score_decimals')
		.eq('id', student.class_id)
		.maybeSingle<ClassRow>();

	if (classError || !classData) {
		return {
			authUser,
			portal: {
				status: 'pending-link' as const,
				message: classError?.message ?? 'Turma não encontrada.'
			},
			summary: {
				studentName: student.name || profile.display_name,
				className: null as string | null,
				totalSubjects: 0,
				subjectsWithScore: 0,
				goodSubjects: 0,
				attentionSubjects: 0,
				pendingSubjects: 0,
				generalAverage: null as number | null,
				generalPercent: null as number | null
			},
			bestSubject: null as SubjectCard | null,
			prioritySubject: null as SubjectCard | null,
			subjects: [] as SubjectCard[],
			academicSummary: {
				title: 'Turma indisponível',
				description:
					'Seu vínculo existe, mas não conseguimos carregar os dados da turma no momento.'
			}
		};
	}

	const { data: skills, error: skillsError } = await locals.supabase
		.from('skills')
		.select('id, name, score_min, score_max, score_decimals')
		.eq('class_id', classData.id)
		.order('created_at', { ascending: true });

	if (skillsError) {
		return {
			authUser,
			portal: {
				status: 'ready' as const,
				message: 'Aluno vinculado, mas houve erro ao carregar as matérias.'
			},
			summary: {
				studentName: student.name || profile.display_name,
				className: classData.name,
				totalSubjects: 0,
				subjectsWithScore: 0,
				goodSubjects: 0,
				attentionSubjects: 0,
				pendingSubjects: 0,
				generalAverage: null as number | null,
				generalPercent: null as number | null
			},
			bestSubject: null as SubjectCard | null,
			prioritySubject: null as SubjectCard | null,
			subjects: [] as SubjectCard[],
			academicSummary: {
				title: 'Erro ao carregar matérias',
				description: skillsError.message
			}
		};
	}

	const skillList = (skills ?? []) as SkillRow[];
	const skillIds = skillList.map((s) => s.id);

	let scores: ScoreRow[] = [];
	if (skillIds.length > 0) {
		const { data: studentScores, error: scoresError } = await locals.supabase
			.from('student_skill_scores')
			.select('skill_id, score')
			.eq('student_id', student.id)
			.in('skill_id', skillIds);

		if (!scoresError) {
			scores = (studentScores ?? []) as ScoreRow[];
		}
	}

	const scoreBySkillId = new Map(scores.map((s) => [s.skill_id, s.score]));

	let goodSubjects = 0;
	let attentionSubjects = 0;
	let pendingSubjects = 0;

	const subjects: SubjectCard[] = skillList.map((skill) => {
		const rawScore = scoreBySkillId.get(skill.id);
		const scale = resolveEffectiveScale(classData, skill);

		if (typeof rawScore !== 'number') {
			pendingSubjects += 1;

			return {
				subjectId: skill.id,
				subjectName: skill.name,
				score: null,
				progress: null,
				status: 'pending',
				description: descriptionFromStatus('pending', null)
			};
		}

		const progress = ratioToPercent(rawScore, scale.min, scale.max);
		const status = statusFromPercent(progress);

		if (status === 'good') goodSubjects += 1;
		else attentionSubjects += 1;

		return {
			subjectId: skill.id,
			subjectName: skill.name,
			score: rawScore,
			progress,
			status,
			description: descriptionFromStatus(status, progress)
		};
	});

	const scoredSubjects = subjects.filter((subject) => typeof subject.score === 'number');

	const totalSubjects = subjects.length;
	const subjectsWithScore = scoredSubjects.length;

	const generalAverage =
		scoredSubjects.length > 0
			? Number(
					(
						scoredSubjects.reduce((sum, subject) => sum + (subject.score ?? 0), 0) /
						scoredSubjects.length
					).toFixed(classData.score_decimals)
				)
			: null;

	const generalPercent =
		scoredSubjects.length > 0
			? Math.round(
					scoredSubjects.reduce((sum, subject) => sum + (subject.progress ?? 0), 0) /
						scoredSubjects.length
				)
			: null;

	const bestSubject =
		[...scoredSubjects].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0] ?? null;

	const prioritySubject =
		[...scoredSubjects].sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0))[0] ??
		(subjects.find((subject) => subject.status === 'pending') ?? null);

	const academicSummary =
		pendingSubjects > 0
			? {
					title: `${pendingSubjects} matéria(s) ainda sem nota`,
					description:
						'Algumas matérias ainda não possuem lançamento. Assim que novas notas entrarem, sua visão geral ficará mais completa.'
				}
			: attentionSubjects > 0
				? {
						title: `${attentionSubjects} matéria(s) pedem mais atenção`,
						description:
							'Seu resultado geral está consolidado, mas vale olhar primeiro para as matérias com menor desempenho.'
					}
				: {
						title: 'Sem pontos críticos no momento',
						description:
							'Seu desempenho está equilibrado nas matérias avaliadas até aqui.'
					};

	return {
		authUser,
		portal: {
			status: 'ready' as const,
			message: 'Dados acadêmicos carregados com sucesso.'
		},
		summary: {
			studentName: student.name || profile.display_name,
			className: classData.name,
			totalSubjects,
			subjectsWithScore,
			goodSubjects,
			attentionSubjects,
			pendingSubjects,
			generalAverage,
			generalPercent
		},
		bestSubject,
		prioritySubject,
		subjects,
		academicSummary
	};
};