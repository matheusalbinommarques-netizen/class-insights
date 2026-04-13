import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { getAuthenticatedUserId } from '$lib/server/auth';
import { loadStudentLongitudinalProfile } from '$lib/server/student-longitudinal-profile';

type ScopeClassRow = {
	class_id: string;
	class_name: string;
	teacher_id: string;
	teacher_name: string;
	access_code: string | null;
};

type CoordSubjectStatus = 'healthy' | 'attention' | 'critical' | 'pending';
type CoordContextStatus = 'healthy' | 'attention' | 'critical' | 'pending';
type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

function formatTenScale(value: number | null): string {
	if (typeof value !== 'number') return '--';

	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	}).format(value / 10);
}

function formatPercentLabel(value: number | null): string {
	if (typeof value !== 'number') return '--';

	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(value);
}

function formatGapTenScale(value: number | null): string {
	if (typeof value !== 'number') return '--';

	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
		signDisplay: 'always'
	}).format(value / 10);
}

function formatGapPercent(value: number | null): string {
	if (typeof value !== 'number') return '--';

	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
		signDisplay: 'always'
	}).format(value);
}

function trendLabel(trend: Trend): string {
	if (trend === 'declining') return 'Em queda';
	if (trend === 'improving') return 'Em melhora';
	if (trend === 'stable') return 'Estável';
	return 'Base insuficiente';
}

function contextStatusLabel(status: CoordContextStatus): string {
	if (status === 'critical') return 'Crítico';
	if (status === 'attention') return 'Atenção';
	if (status === 'healthy') return 'Dentro do esperado';
	return 'Sem base';
}

function mapSubjectStatus(input: {
	progress: number | null;
	status: 'good' | 'attention' | 'pending';
	gapPercent: number | null;
}): CoordSubjectStatus {
	if (input.status === 'pending' || typeof input.progress !== 'number') {
		return 'pending';
	}

	if (input.progress < 50) {
		return 'critical';
	}

	if (input.status === 'attention') {
		return 'attention';
	}

	if (typeof input.gapPercent === 'number' && input.gapPercent <= -10) {
		return 'attention';
	}

	return 'healthy';
}

function classifyContextStatus(input: {
	studentAverage: number | null;
	classAverage: number | null;
	gapPercent: number | null;
	publishedAssessments: number;
	attentionSubjects: number;
	pendingSubjects: number;
}): CoordContextStatus {
	if (input.publishedAssessments === 0 || typeof input.studentAverage !== 'number') {
		return 'pending';
	}

	if (
		input.studentAverage < 50 ||
		(typeof input.gapPercent === 'number' && input.gapPercent <= -20)
	) {
		return 'critical';
	}

	if (
		input.studentAverage < 70 ||
		(typeof input.gapPercent === 'number' && input.gapPercent <= -10) ||
		input.attentionSubjects > 0 ||
		input.pendingSubjects > 0
	) {
		return 'attention';
	}

	return 'healthy';
}

function buildPrimaryReason(input: {
	contextStatus: CoordContextStatus;
	publishedAssessments: number;
	gapPercent: number | null;
	prioritySubjectName: string | null;
	attentionSubjects: number;
	pendingSubjects: number;
}): string {
	if (input.publishedAssessments === 0) {
		return 'Ainda não há publicações suficientes para uma leitura institucional firme deste aluno.';
	}

	if (
		input.contextStatus === 'critical' &&
		typeof input.gapPercent === 'number' &&
		input.gapPercent <= -20
	) {
		return 'O aluno está bem abaixo da média publicada da turma e pede acompanhamento prioritário.';
	}

	if (input.contextStatus === 'critical') {
		return 'O aluno apresenta sinais críticos no recorte publicado da turma.';
	}

	if (input.prioritySubjectName) {
		return `A principal matéria de atenção no momento é ${input.prioritySubjectName}.`;
	}

	if (input.attentionSubjects > 0) {
		return `Há ${input.attentionSubjects} matéria(s) em atenção no recorte atual.`;
	}

	if (input.pendingSubjects > 0) {
		return `Ainda faltam ${input.pendingSubjects} matéria(s) com base suficiente para leitura mais completa.`;
	}

	return 'O aluno está dentro do esperado no contexto institucional atual.';
}

function buildSubjectReason(input: {
	subjectName: string;
	status: CoordSubjectStatus;
	gapPercent: number | null;
	recentTrend: Trend;
	latestAssessmentTitle: string | null;
}): string {
	if (input.status === 'pending') {
		return `Ainda não há base publicada suficiente em ${input.subjectName}.`;
	}

	if (input.status === 'critical') {
		return `Esta é a matéria mais crítica no momento para o aluno.`;
	}

	if (typeof input.gapPercent === 'number' && input.gapPercent <= -10) {
		return `O aluno aparece abaixo da média da turma em ${input.subjectName}.`;
	}

	if (input.recentTrend === 'declining') {
		return `A trajetória recente em ${input.subjectName} mostra queda.`;
	}

	if (input.latestAssessmentTitle) {
		return `A leitura mais recente desta matéria vem de ${input.latestAssessmentTitle}.`;
	}

	return `A leitura atual de ${input.subjectName} está dentro do esperado.`;
}

function pickCriticalSubject<
	T extends {
		status: CoordSubjectStatus;
		studentAverage: number | null;
		gap: number | null;
	}
>(subjects: T[]): T | null {
	const ranked = [...subjects].sort((left, right) => {
		const severity = (status: CoordSubjectStatus) => {
			if (status === 'critical') return 0;
			if (status === 'attention') return 1;
			if (status === 'pending') return 2;
			return 3;
		};

		const severityDelta = severity(left.status) - severity(right.status);
		if (severityDelta !== 0) return severityDelta;

		const leftAverage =
			typeof left.studentAverage === 'number' ? left.studentAverage : Number.POSITIVE_INFINITY;
		const rightAverage =
			typeof right.studentAverage === 'number' ? right.studentAverage : Number.POSITIVE_INFINITY;

		if (leftAverage !== rightAverage) {
			return leftAverage - rightAverage;
		}

		const leftGap = typeof left.gap === 'number' ? left.gap : Number.POSITIVE_INFINITY;
		const rightGap = typeof right.gap === 'number' ? right.gap : Number.POSITIVE_INFINITY;

		return leftGap - rightGap;
	});

	return ranked[0] ?? null;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const coordId = getAuthenticatedUserId(locals);

	if (!coordId) {
		throw error(401, 'Você precisa estar autenticado.');
	}

	const longitudinalResult = await loadStudentLongitudinalProfile(locals, {
		kind: 'coord',
		coordId,
		studentId: params.studentId
	});

	if (!longitudinalResult.ok) {
		if (longitudinalResult.state === 'error') {
			throw error(500, longitudinalResult.message);
		}

		throw error(404, longitudinalResult.message);
	}

	const { data: scopeData, error: scopeError } = await locals.supabase.rpc('coord_scope_classes');

	if (scopeError) {
		throw error(500, 'Não foi possível carregar o escopo da coordenação.');
	}

	const scopeClasses = (scopeData ?? []) as ScopeClassRow[];
	const scopedClass = scopeClasses.find(
		(item) => item.class_id === longitudinalResult.profile.student.classId
	);

	if (!scopedClass) {
		throw error(404, 'Aluno fora do escopo da coordenação.');
	}

	const profile = longitudinalResult.profile;

	const studentAverage = profile.summary.generalPercent;
	const classAverage = profile.summary.classAveragePercent;
	const gapPercent = profile.summary.gapPercent;

	const contextStatus = classifyContextStatus({
		studentAverage,
		classAverage,
		gapPercent,
		publishedAssessments: profile.summary.publishedAssessments,
		attentionSubjects: profile.summary.attentionSubjects,
		pendingSubjects: profile.summary.pendingSubjects
	});

	const subjects = profile.subjects
		.map((subject) => {
			const status = mapSubjectStatus({
				progress: subject.progress,
				status: subject.status,
				gapPercent: subject.gapPercent
			});

			return {
				subjectId: subject.id,
				subjectName: subject.name,
				subjectCode: subject.code,
				studentAverage: subject.progress,
				studentAverageLabel: formatTenScale(subject.progress),
				studentAveragePercentLabel: formatPercentLabel(subject.progress),
				classAverage: subject.classAverage,
				classAverageLabel: formatTenScale(subject.classAverage),
				classAveragePercentLabel: formatPercentLabel(subject.classAverage),
				gap: subject.gapPercent,
				gapLabel: formatGapTenScale(subject.gapPercent),
				gapPercentLabel: formatGapPercent(subject.gapPercent),
				assessmentsCount: subject.assessmentsCount,
				status,
				recentTrend: subject.recentTrend,
				recentTrendLabel: trendLabel(subject.recentTrend),
				description: subject.description,
				latestAssessmentTitle: subject.latestAssessmentTitle,
				latestAssessmentDate: subject.latestAssessmentDate,
				primaryReason: buildSubjectReason({
					subjectName: subject.name,
					status,
					gapPercent: subject.gapPercent,
					recentTrend: subject.recentTrend,
					latestAssessmentTitle: subject.latestAssessmentTitle
				}),
				detailHref: `/coord/subjects/${subject.id}`
			};
		})
		.sort((left, right) => {
			const leftValue =
				typeof left.studentAverage === 'number' ? left.studentAverage : Number.POSITIVE_INFINITY;
			const rightValue =
				typeof right.studentAverage === 'number' ? right.studentAverage : Number.POSITIVE_INFINITY;

			return leftValue - rightValue;
		});

	const criticalSubject =
		pickCriticalSubject(subjects) ??
		(profile.prioritySubject
			? (subjects.find((subject) => subject.subjectId === profile.prioritySubject?.id) ?? null)
			: null);

	const latestPublications = profile.timeline.map((point) => ({
		assessmentId: point.assessmentId,
		title: point.assessmentTitle,
		assessmentDate: point.assessmentDate,
		subjectId: point.subjectId,
		subjectName: point.subjectName,
		studentScore: point.studentPercent,
		studentScoreLabel: formatTenScale(point.studentPercent),
		studentPercentLabel: formatPercentLabel(point.studentPercent),
		classScore: point.classAveragePercent,
		classScoreLabel: formatTenScale(point.classAveragePercent),
		classPercentLabel: formatPercentLabel(point.classAveragePercent),
		gapPercent: point.gapPercent,
		gapPercentLabel: formatGapPercent(point.gapPercent)
	}));

	const primaryReason = buildPrimaryReason({
		contextStatus,
		publishedAssessments: profile.summary.publishedAssessments,
		gapPercent,
		prioritySubjectName: criticalSubject?.subjectName ?? null,
		attentionSubjects: profile.summary.attentionSubjects,
		pendingSubjects: profile.summary.pendingSubjects
	});

	return {
		student: {
			id: profile.student.id,
			name: profile.student.displayName,
			classId: profile.student.classId,
			className: profile.student.className,
			teacherName: scopedClass.teacher_name,
			accessCode: scopedClass.access_code,
			exportHref: `/coord/students/${profile.student.id}/export`
		},
		summary: {
			studentAverage,
			studentAverageLabel: formatTenScale(studentAverage),
			studentAveragePercentLabel: formatPercentLabel(studentAverage),
			classAverage,
			classAverageLabel: formatTenScale(classAverage),
			classAveragePercentLabel: formatPercentLabel(classAverage),
			publishedAssessments: profile.summary.publishedAssessments,
			subjectsCount: profile.summary.totalSubjects,
			subjectsWithScore: profile.summary.subjectsWithScore,
			attentionSubjects: profile.summary.attentionSubjects,
			pendingSubjects: profile.summary.pendingSubjects,
			gap: gapPercent,
			gapLabel: formatGapTenScale(gapPercent),
			gapPercentLabel: formatGapPercent(gapPercent),
			recentTrend: profile.longitudinal?.recent_trend ?? 'insufficient_data',
			recentTrendLabel: trendLabel(profile.longitudinal?.recent_trend ?? 'insufficient_data'),
			contextStatus,
			contextStatusLabel: contextStatusLabel(contextStatus),
			primaryReason
		},
		institutionalFocus: {
			contextStatus,
			contextStatusLabel: contextStatusLabel(contextStatus),
			primaryReason,
			criticalSubject: criticalSubject
				? {
						subjectId: criticalSubject.subjectId,
						subjectName: criticalSubject.subjectName,
						studentAverage: criticalSubject.studentAverage,
						studentAverageLabel: criticalSubject.studentAverageLabel,
						studentAveragePercentLabel: criticalSubject.studentAveragePercentLabel,
						classAverage: criticalSubject.classAverage,
						classAverageLabel: criticalSubject.classAverageLabel,
						classAveragePercentLabel: criticalSubject.classAveragePercentLabel,
						gap: criticalSubject.gap,
						gapLabel: criticalSubject.gapLabel,
						gapPercentLabel: criticalSubject.gapPercentLabel,
						status: criticalSubject.status,
						recentTrend: criticalSubject.recentTrend,
						recentTrendLabel: criticalSubject.recentTrendLabel,
						assessmentsCount: criticalSubject.assessmentsCount,
						latestAssessmentTitle: criticalSubject.latestAssessmentTitle,
						latestAssessmentDate: criticalSubject.latestAssessmentDate,
						primaryReason: criticalSubject.primaryReason,
						detailHref: criticalSubject.detailHref
					}
				: null,
			historicalContext: {
				recentTrend: profile.longitudinal?.recent_trend ?? 'insufficient_data',
				recentTrendLabel: trendLabel(profile.longitudinal?.recent_trend ?? 'insufficient_data'),
				bestSubject: profile.longitudinal?.best_subject ?? null,
				worstSubject: profile.longitudinal?.worst_subject ?? null,
				academicSummaryTitle: profile.academicSummary.title,
				academicSummaryDescription: profile.academicSummary.description
			}
		},
		academicSummary: profile.academicSummary,
		longitudinal: profile.longitudinal,
		subjects,
		latestPublications,
		timeline: latestPublications
	};
};
