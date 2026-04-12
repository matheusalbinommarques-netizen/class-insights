import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

import { getAuthenticatedUserId } from '$lib/server/auth';
import { buildTeacherDashboardPageData } from '$lib/server/teacher-dashboard';
import type {
	TeacherDashboardClassSummaryItem,
	TeacherDashboardPageData,
	TeacherDashboardRiskTone
} from '$lib/types/teacher';

type TeacherPriorityActionKind =
	| 'draft_open'
	| 'assessment_alert'
	| 'student_risk'
	| 'class_without_subject';

type TeacherPriorityAction = {
	kind: TeacherPriorityActionKind;
	priorityRank: number;
	count: number;
	title: string;
	reason: string;
	href: string;
	primaryLabel: string;
	severity: TeacherDashboardRiskTone;
	sourceLabel: string | null;
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

function normalizeText(value: string) {
	return value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.trim();
}

function tagIncludes(tags: string[], term: string) {
	const normalizedTerm = normalizeText(term);
	return tags.some((tag) => normalizeText(tag).includes(normalizedTerm));
}

function findClassWithDraft(classesSummary: TeacherDashboardClassSummaryItem[]) {
	return (
		classesSummary.find((item) => tagIncludes(item.tags, 'rascunho')) ??
		classesSummary.find(
			(item) => item.statusTone === 'attention' && tagIncludes(item.tags, 'cobertura')
		) ??
		null
	);
}

function findClassWithoutSubject(classesSummary: TeacherDashboardClassSummaryItem[]) {
	return (
		classesSummary.find((item) => tagIncludes(item.tags, 'sem materia')) ??
		classesSummary.find((item) => tagIncludes(item.tags, 'sem matéria')) ??
		null
	);
}

function buildPrioritizedActionQueue(dashboard: TeacherDashboardPageData): TeacherPriorityAction[] {
	const queue: TeacherPriorityAction[] = [];

	const draftClass = findClassWithDraft(dashboard.classesSummary);
	const assessmentAlert = dashboard.performanceChanges.belowReferenceSubjects[0] ?? null;
	const fallingStudent = dashboard.performanceChanges.fallingStudents[0] ?? null;
	const relevantGap = dashboard.performanceChanges.relevantGaps[0] ?? null;
	const classWithoutSubject = findClassWithoutSubject(dashboard.classesSummary);

	if (dashboard.actionNow.draftClasses > 0) {
		queue.push({
			kind: 'draft_open',
			priorityRank: 1,
			count: dashboard.actionNow.draftClasses,
			title:
				dashboard.actionNow.draftClasses === 1
					? 'Há 1 turma com rascunho aberto'
					: `Há ${dashboard.actionNow.draftClasses} turmas com rascunho aberto`,
			reason:
				'Feche primeiro o que já foi iniciado. Rascunhos abertos prolongam revisão, atrasam publicação e espalham a operação.',
			href: draftClass?.openHref ?? '/teacher/assessments',
			primaryLabel: draftClass ? 'Abrir turma' : 'Ver avaliações',
			severity: 'attention',
			sourceLabel: draftClass?.className ?? null
		});
	}

	if (dashboard.actionNow.belowReferenceSubjects > 0) {
		queue.push({
			kind: 'assessment_alert',
			priorityRank: 2,
			count: dashboard.actionNow.belowReferenceSubjects,
			title:
				dashboard.actionNow.belowReferenceSubjects === 1
					? '1 matéria publicada pede revisão'
					: `${dashboard.actionNow.belowReferenceSubjects} matérias publicadas pedem revisão`,
			reason:
				assessmentAlert?.helperText ??
				'Existem publicações abaixo da referência esperada. Vale revisar distribuição, cobertura e necessidade de intervenção.',
			href:
				assessmentAlert?.href ??
				dashboard.performanceChanges.belowReferenceSubjectsHref ??
				'/teacher/assessments',
			primaryLabel: 'Revisar publicações',
			severity: 'attention',
			sourceLabel: assessmentAlert?.subjectName ?? null
		});
	}

	const riskStudentsCount = Math.max(
		dashboard.actionNow.fallingStudents,
		dashboard.performanceChanges.fallingStudents.length,
		dashboard.performanceChanges.relevantGaps.length
	);

	if (riskStudentsCount > 0) {
		const sourceLabel = fallingStudent?.studentName ?? relevantGap?.studentName ?? null;
		const severity: TeacherDashboardRiskTone =
			fallingStudent?.riskTone ?? relevantGap?.riskTone ?? 'attention';

		queue.push({
			kind: 'student_risk',
			priorityRank: 3,
			count: riskStudentsCount,
			title:
				riskStudentsCount === 1
					? '1 aluno em risco merece acompanhamento'
					: `${riskStudentsCount} alunos em risco merecem acompanhamento`,
			reason:
				fallingStudent?.helperText ??
				relevantGap?.helperText ??
				'As publicações recentes indicam queda ou distância relevante da referência. Vale aprofundar a leitura por aluno.',
			href:
				fallingStudent?.href ??
				relevantGap?.href ??
				dashboard.performanceChanges.fallingStudentsHref ??
				dashboard.performanceChanges.relevantGapsHref ??
				'/teacher/classes',
			primaryLabel: 'Ver alunos em risco',
			severity,
			sourceLabel
		});
	}

	if (dashboard.actionNow.classesWithoutSubject > 0) {
		queue.push({
			kind: 'class_without_subject',
			priorityRank: 4,
			count: dashboard.actionNow.classesWithoutSubject,
			title:
				dashboard.actionNow.classesWithoutSubject === 1
					? '1 turma ainda está sem matéria'
					: `${dashboard.actionNow.classesWithoutSubject} turmas ainda estão sem matéria`,
			reason:
				'Sem matéria vinculada, a turma não entra no fluxo oficial da V1. Esse é o ponto certo para destravar avaliação, lançamento e publicação.',
			href: classWithoutSubject?.openHref ?? '/teacher/subjects',
			primaryLabel: classWithoutSubject ? 'Abrir turma' : 'Vincular matéria',
			severity: 'attention',
			sourceLabel: classWithoutSubject?.className ?? null
		});
	}

	return queue.sort((left, right) => left.priorityRank - right.priorityRank);
}

export const load: PageServerLoad = async ({ locals }) => {
	const dashboard = await buildTeacherDashboardPageData(locals);

	return {
		...dashboard,
		prioritizedActionQueue: buildPrioritizedActionQueue(dashboard)
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
			return fail(400, { action: 'createClass', message: 'Nome da turma é obrigatório.' });
		}

		if (!Number.isFinite(scoreMin) || !Number.isFinite(scoreMax)) {
			return fail(400, {
				action: 'createClass',
				message: 'Escala inválida: mínimo e máximo precisam ser numéricos.'
			});
		}

		if (!(scoreMax > scoreMin)) {
			return fail(400, {
				action: 'createClass',
				message: 'Escala inválida: a nota máxima precisa ser maior que a mínima.'
			});
		}

		if (!Number.isInteger(scoreDecimals) || scoreDecimals < 0 || scoreDecimals > 6) {
			return fail(400, {
				action: 'createClass',
				message: 'Casas decimais inválidas. Use um valor entre 0 e 6.'
			});
		}

		const userId = getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { action: 'createClass', message: 'Você precisa estar logado.' });
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
	}
};
