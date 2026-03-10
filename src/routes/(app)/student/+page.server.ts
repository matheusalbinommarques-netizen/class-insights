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

type Highlight = {
	title: string;
	description: string;
	type: 'good' | 'warn' | 'neutral';
};

function ratioToPercent(value: number, min: number, max: number): number {
	const range = max - min;
	if (range <= 0) return 0;

	const ratio = (value - min) / range;
	return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}

function statusFromPercent(percent: number): 'completed' | 'progress' | 'attention' {
	if (percent >= 70) return 'completed';
	if (percent >= 40) return 'progress';
	return 'attention';
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
				status: 'pending-link',
				message: studentError.message
			},
			summary: {
				studentName: profile.display_name,
				className: null as string | null,
				totalSkills: 0,
				completedSkills: 0,
				inProgressSkills: 0,
				attentionSkills: 0,
				overallProgress: null as number | null
			},
			highlights: [
				{
					title: 'Vínculo ainda não concluído',
					description:
						'Seu login existe, mas ainda não foi ligado a um registro acadêmico válido.',
					type: 'warn'
				}
			] satisfies Highlight[]
		};
	}

	if (!student) {
		return {
			authUser,
			portal: {
				status: 'pending-link',
				message:
					'Conta autenticada, mas ainda não encontramos um aluno vinculado a este usuário.'
			},
			summary: {
				studentName: profile.display_name,
				className: null as string | null,
				totalSkills: 0,
				completedSkills: 0,
				inProgressSkills: 0,
				attentionSkills: 0,
				overallProgress: null as number | null
			},
			highlights: [
				{
					title: 'Conta sem vínculo acadêmico',
					description:
						'Faça login com a conta correta ou conclua o vínculo usando o código de convite.',
					type: 'warn'
				}
			] satisfies Highlight[]
		};
	}

	if (!student.class_id) {
		return {
			authUser,
			portal: {
				status: 'pending-link',
				message: 'Aluno vinculado sem turma associada.'
			},
			summary: {
				studentName: student.name || profile.display_name,
				className: null as string | null,
				totalSkills: 0,
				completedSkills: 0,
				inProgressSkills: 0,
				attentionSkills: 0,
				overallProgress: null as number | null
			},
			highlights: [
				{
					title: 'Turma não encontrada',
					description:
						'Seu usuário foi ligado a um aluno, mas esse aluno ainda não possui turma válida.',
					type: 'warn'
				}
			] satisfies Highlight[]
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
				status: 'pending-link',
				message: classError?.message ?? 'Turma não encontrada.'
			},
			summary: {
				studentName: student.name || profile.display_name,
				className: null as string | null,
				totalSkills: 0,
				completedSkills: 0,
				inProgressSkills: 0,
				attentionSkills: 0,
				overallProgress: null as number | null
			},
			highlights: [
				{
					title: 'Turma indisponível',
					description:
						'Seu vínculo existe, mas não conseguimos carregar os dados da turma no momento.',
					type: 'warn'
				}
			] satisfies Highlight[]
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
				status: 'ready',
				message: 'Aluno vinculado, mas houve erro ao carregar as skills.'
			},
			summary: {
				studentName: student.name || profile.display_name,
				className: classData.name,
				totalSkills: 0,
				completedSkills: 0,
				inProgressSkills: 0,
				attentionSkills: 0,
				overallProgress: null as number | null
			},
			highlights: [
				{
					title: 'Erro ao carregar skills',
					description: skillsError.message,
					type: 'warn'
				}
			] satisfies Highlight[]
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

	let completedSkills = 0;
	let inProgressSkills = 0;
	let attentionSkills = 0;

	const skillProgressRows = skillList.map((skill) => {
		const rawScore = scoreBySkillId.get(skill.id);
		const scale = resolveEffectiveScale(classData, skill);

		if (typeof rawScore !== 'number') {
			attentionSkills += 1;

			return {
				skillId: skill.id,
				skillName: skill.name,
				score: null as number | null,
				progress: 0,
				status: 'attention' as const
			};
		}

		const percent = ratioToPercent(rawScore, scale.min, scale.max);
		const status = statusFromPercent(percent);

		if (status === 'completed') completedSkills += 1;
		else if (status === 'progress') inProgressSkills += 1;
		else attentionSkills += 1;

		return {
			skillId: skill.id,
			skillName: skill.name,
			score: rawScore,
			progress: percent,
			status
		};
	});

	const totalSkills = skillProgressRows.length;
	const progressValues = skillProgressRows.map((row) => row.progress);
	const overallProgress =
		progressValues.length > 0
			? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
			: null;

	const weakestSkill =
		[...skillProgressRows].sort((a, b) => a.progress - b.progress)[0] ?? null;

	const strongestSkill =
		[...skillProgressRows].sort((a, b) => b.progress - a.progress)[0] ?? null;

	const highlights: Highlight[] = [];

	if (strongestSkill) {
		highlights.push({
			title: `Ponto forte: ${strongestSkill.skillName}`,
			description:
				typeof strongestSkill.score === 'number'
					? `Seu melhor desempenho atual está aqui, com progresso estimado de ${strongestSkill.progress}%.`
					: 'Esta habilidade aparece como seu melhor ponto atual.',
			type: 'good'
		});
	}

	if (weakestSkill) {
		highlights.push({
			title: `Prioridade de revisão: ${weakestSkill.skillName}`,
			description:
				typeof weakestSkill.score === 'number'
					? `Esta é a habilidade com menor progresso no momento (${weakestSkill.progress}%).`
					: 'Ainda não há nota lançada para esta habilidade, então ela merece atenção.',
			type: 'warn'
		});
	}

	if (totalSkills === 0) {
		highlights.push({
			title: 'Nenhuma skill cadastrada',
			description: 'Sua turma ainda não possui habilidades cadastradas para acompanhamento.',
			type: 'neutral'
		});
	} else if (attentionSkills === 0) {
		highlights.push({
			title: 'Sem pontos críticos no momento',
			description: 'Nenhuma habilidade ficou na faixa de maior atenção.',
			type: 'good'
		});
	} else {
		highlights.push({
			title: `${attentionSkills} habilidade(s) pedem atenção`,
			description: 'Use a área de skills para ver com mais clareza onde revisar primeiro.',
			type: 'neutral'
		});
	}

	return {
		authUser,
		portal: {
			status: 'ready',
			message: 'Aluno vinculado com sucesso. Dados reais carregados.'
		},
		summary: {
			studentName: student.name || profile.display_name,
			className: classData.name,
			totalSkills,
			completedSkills,
			inProgressSkills,
			attentionSkills,
			overallProgress
		},
		highlights
	};
};