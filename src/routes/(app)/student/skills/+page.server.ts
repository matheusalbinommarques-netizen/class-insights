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

type SkillStatus = 'dominada' | 'evoluindo' | 'atenção';

function ratioToPercent(value: number, min: number, max: number): number {
	const range = max - min;
	if (range <= 0) return 0;

	const ratio = (value - min) / range;
	return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}

function statusFromPercent(percent: number): SkillStatus {
	if (percent >= 70) return 'dominada';
	if (percent >= 40) return 'evoluindo';
	return 'atenção';
}

function descriptionFromStatus(
	status: SkillStatus,
	progress: number,
	score: number | null
): string {
	if (score === null) {
		return 'Ainda não há nota lançada para esta skill.';
	}

	if (status === 'dominada') {
		return `Bom desempenho até aqui, com progresso estimado de ${progress}%.`;
	}

	if (status === 'evoluindo') {
		return `Você está avançando nesta skill. Progresso atual estimado: ${progress}%.`;
	}

	return `Esta skill pede revisão prioritária. Progresso atual estimado: ${progress}%.`;
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
			skillsPortal: {
				status: 'pending-link' as const,
				message: studentError.message
			},
			student: {
				displayName: profile.display_name,
				className: null as string | null
			},
			skills: [] as {
				id: string;
				name: string;
				progress: number | null;
				score: number | null;
				status: SkillStatus;
				description: string | null;
			}[],
			summary: {
				total: 0,
				dominada: 0,
				evoluindo: 0,
				atencao: 0
			}
		};
	}

	if (!student) {
		return {
			authUser,
			skillsPortal: {
				status: 'pending-link' as const,
				message:
					'Conta autenticada, mas ainda não encontramos um aluno vinculado a este usuário.'
			},
			student: {
				displayName: profile.display_name,
				className: null as string | null
			},
			skills: [] as {
				id: string;
				name: string;
				progress: number | null;
				score: number | null;
				status: SkillStatus;
				description: string | null;
			}[],
			summary: {
				total: 0,
				dominada: 0,
				evoluindo: 0,
				atencao: 0
			}
		};
	}

	if (!student.class_id) {
		return {
			authUser,
			skillsPortal: {
				status: 'pending-link' as const,
				message: 'Aluno vinculado sem turma associada.'
			},
			student: {
				displayName: student.name || profile.display_name,
				className: null as string | null
			},
			skills: [] as {
				id: string;
				name: string;
				progress: number | null;
				score: number | null;
				status: SkillStatus;
				description: string | null;
			}[],
			summary: {
				total: 0,
				dominada: 0,
				evoluindo: 0,
				atencao: 0
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
			skillsPortal: {
				status: 'pending-link' as const,
				message: classError?.message ?? 'Turma não encontrada.'
			},
			student: {
				displayName: student.name || profile.display_name,
				className: null as string | null
			},
			skills: [] as {
				id: string;
				name: string;
				progress: number | null;
				score: number | null;
				status: SkillStatus;
				description: string | null;
			}[],
			summary: {
				total: 0,
				dominada: 0,
				evoluindo: 0,
				atencao: 0
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
			skillsPortal: {
				status: 'pending-link' as const,
				message: skillsError.message
			},
			student: {
				displayName: student.name || profile.display_name,
				className: classData.name
			},
			skills: [] as {
				id: string;
				name: string;
				progress: number | null;
				score: number | null;
				status: SkillStatus;
				description: string | null;
			}[],
			summary: {
				total: 0,
				dominada: 0,
				evoluindo: 0,
				atencao: 0
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

	let dominada = 0;
	let evoluindo = 0;
	let atencao = 0;

	const mappedSkills = skillList.map((skill) => {
		const rawScore = scoreBySkillId.get(skill.id);

		if (typeof rawScore !== 'number') {
			atencao += 1;

			return {
				id: skill.id,
				name: skill.name,
				progress: 0,
				score: null as number | null,
				status: 'atenção' as const,
				description: 'Ainda não há nota lançada para esta skill.'
			};
		}

		const scale = resolveEffectiveScale(classData, skill);
		const progress = ratioToPercent(rawScore, scale.min, scale.max);
		const status = statusFromPercent(progress);

		if (status === 'dominada') dominada += 1;
		else if (status === 'evoluindo') evoluindo += 1;
		else atencao += 1;

		return {
			id: skill.id,
			name: skill.name,
			progress,
			score: rawScore,
			status,
			description: descriptionFromStatus(status, progress, rawScore)
		};
	});

	return {
		authUser,
		skillsPortal: {
			status: 'ready' as const,
			message: 'Skills reais carregadas.'
		},
		student: {
			displayName: student.name || profile.display_name,
			className: classData.name
		},
		skills: mappedSkills,
		summary: {
			total: mappedSkills.length,
			dominada,
			evoluindo,
			atencao
		}
	};
};