import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { loadStudentPortalData } from '$lib/server/student-portal';

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

type ClaimFormState = {
	action: 'claimInviteCode';
	message: string;
	values: {
		invite_code: string;
	};
};

type SubjectStatus = 'good' | 'attention' | 'pending';
type RawTrend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

type SubjectItem = {
	id: string;
	name: string;
	code: string | null;
	progress: number | null;
	score: number | null;
	status: SubjectStatus;
	description: string;
	assessmentsCount: number;
	latestAssessmentTitle: string | null;
	latestAssessmentDate: string | null;
};

type TimelinePoint = {
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

type SemanticTrendDirection = 'estável' | 'em melhora' | 'em atenção' | 'base insuficiente';
type SemanticSituation = 'saudável' | 'em atenção' | 'base insuficiente';

type SemanticSubjectHighlight = {
	id: string;
	name: string;
	code: string | null;
	situation: SemanticSituation;
	reason: string;
	currentAverage: number | null;
	normalizedPercent: number | null;
	assessmentsCount: number;
	latestAssessmentTitle: string | null;
	latestAssessmentDate: string | null;
};

type RecentPublicationItem = {
	assessmentId: string;
	title: string;
	date: string;
	subjectId: string;
	subjectName: string;
	rawScore: number | null;
	normalizedPercent: number | null;
	classAveragePercent: number | null;
	gapPercent: number | null;
	comparisonLabel: string;
	performanceLabel: string;
};

function normalizeInviteCode(raw: FormDataEntryValue | null) {
	return String(raw ?? '')
		.trim()
		.toUpperCase()
		.replace(/\s+/g, '');
}

function roundTo(value: number, decimals = 2) {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

function mapTrendDirection(raw: RawTrend | null | undefined): SemanticTrendDirection {
	switch (raw) {
		case 'improving':
			return 'em melhora';
		case 'declining':
			return 'em atenção';
		case 'stable':
			return 'estável';
		default:
			return 'base insuficiente';
	}
}

function mapSituation(status: SubjectStatus): SemanticSituation {
	switch (status) {
		case 'good':
			return 'saudável';
		case 'attention':
			return 'em atenção';
		default:
			return 'base insuficiente';
	}
}

function buildComparisonLabel(point: TimelinePoint): string {
	const gap = point.gapPercent;

	if (typeof gap !== 'number') {
		return 'Sem base comparativa suficiente';
	}

	if (gap >= 5) {
		return 'Acima da média da turma';
	}

	if (gap <= -5) {
		return 'Abaixo da média da turma';
	}

	return 'Próximo da média da turma';
}

function buildPerformanceLabel(point: TimelinePoint): string {
	if (typeof point.studentPercent !== 'number') {
		return 'Publicação sem base suficiente';
	}

	if (point.studentPercent >= 75) {
		return 'Desempenho forte';
	}

	if (point.studentPercent < 60) {
		return 'Ponto de atenção';
	}

	return 'Desempenho estável';
}

function buildSubjectHighlight(subject: SubjectItem | null): SemanticSubjectHighlight | null {
	if (!subject) return null;

	return {
		id: subject.id,
		name: subject.name,
		code: subject.code,
		situation: mapSituation(subject.status),
		reason: subject.description,
		currentAverage: subject.score,
		normalizedPercent: subject.progress,
		assessmentsCount: subject.assessmentsCount,
		latestAssessmentTitle: subject.latestAssessmentTitle,
		latestAssessmentDate: subject.latestAssessmentDate
	};
}

function buildRecentPublications(
	timeline: Array<{
		assessmentId: string;
		assessmentTitle: string;
		assessmentDate: string;
		subjectId: string;
		subjectName: string;
		rawScore: number | null;
		studentPercent: number | null;
		classAveragePercent: number | null;
		gapPercent: number | null;
	}> | null
): RecentPublicationItem[] {
	if (!timeline?.length) return [];

	return [...timeline]
		.sort((a, b) => b.assessmentDate.localeCompare(a.assessmentDate))
		.slice(0, 5)
		.map((point) => ({
			assessmentId: point.assessmentId,
			title: point.assessmentTitle,
			date: point.assessmentDate,
			subjectId: point.subjectId,
			subjectName: point.subjectName,
			rawScore: point.rawScore,
			normalizedPercent:
				typeof point.studentPercent === 'number' ? roundTo(point.studentPercent, 1) : null,
			classAveragePercent:
				typeof point.classAveragePercent === 'number'
					? roundTo(point.classAveragePercent, 1)
					: null,
			gapPercent: typeof point.gapPercent === 'number' ? roundTo(point.gapPercent, 1) : null,
			comparisonLabel: buildComparisonLabel(point),
			performanceLabel: buildPerformanceLabel(point)
		}));
}

export const load: PageServerLoad = async ({ locals, parent, cookies }) => {
	const parentData = (await parent()) as ParentData;

	if (!parentData.authUser?.id) {
		throw redirect(302, '/login');
	}

	const payload = await loadStudentPortalData(locals, parentData, cookies);

	const bestSubject = payload.bestSubject
		? {
				id: payload.bestSubject.id,
				name: payload.bestSubject.name,
				code: payload.bestSubject.code,
				progress: payload.bestSubject.progress,
				score: payload.bestSubject.score,
				status: payload.bestSubject.status,
				description: payload.bestSubject.description,
				assessmentsCount: payload.bestSubject.assessmentsCount,
				latestAssessmentTitle: payload.bestSubject.latestAssessmentTitle,
				latestAssessmentDate: payload.bestSubject.latestAssessmentDate
			}
		: null;

	const prioritySubject = payload.prioritySubject
		? {
				id: payload.prioritySubject.id,
				name: payload.prioritySubject.name,
				code: payload.prioritySubject.code,
				progress: payload.prioritySubject.progress,
				score: payload.prioritySubject.score,
				status: payload.prioritySubject.status,
				description: payload.prioritySubject.description,
				assessmentsCount: payload.prioritySubject.assessmentsCount,
				latestAssessmentTitle: payload.prioritySubject.latestAssessmentTitle,
				latestAssessmentDate: payload.prioritySubject.latestAssessmentDate
			}
		: null;

	const subjects = payload.subjects.map((subject) => ({
		id: subject.id,
		name: subject.name,
		code: subject.code,
		progress: subject.progress,
		score: subject.score,
		status: subject.status,
		description: subject.description,
		assessmentsCount: subject.assessmentsCount,
		latestAssessmentTitle: subject.latestAssessmentTitle,
		latestAssessmentDate: subject.latestAssessmentDate
	}));

	const timeline: TimelinePoint[] | null = payload.longitudinal
		? payload.longitudinal.timeline.map((point) => ({
				assessmentId: point.assessment_id,
				assessmentTitle: point.assessment_title,
				assessmentDate: point.assessment_date,
				subjectId: point.subject_id,
				subjectName: point.subject_name,
				rawScore: point.raw_score,
				studentPercent: point.normalized_percent,
				classAveragePercent: null,
				gapPercent: null
			}))
		: null;

	const currentAverage =
		typeof payload.summary.generalAverage === 'number'
			? roundTo(payload.summary.generalAverage, 2)
			: null;

	const currentAveragePercent =
		typeof payload.summary.generalPercent === 'number'
			? roundTo(payload.summary.generalPercent, 1)
			: null;

	const trendDirection = mapTrendDirection(payload.longitudinal?.recent_trend);

	const recentPublications = buildRecentPublications(
		payload.longitudinal
			? payload.longitudinal.timeline.map((point) => ({
					assessmentId: point.assessment_id,
					assessmentTitle: point.assessment_title,
					assessmentDate: point.assessment_date,
					subjectId: point.subject_id,
					subjectName: point.subject_name,
					rawScore: point.raw_score,
					studentPercent: point.normalized_percent,
					classAveragePercent: null,
					gapPercent: null
				}))
			: null
	);

	return {
		authUser: payload.authUser,
		overviewPortal: payload.portal,
		student: payload.student,
		summary: payload.summary,
		bestSubject,
		prioritySubject,
		subjects,
		academicSummary: payload.academicSummary,
		longitudinal: payload.longitudinal
			? {
					best_subject: payload.longitudinal.best_subject,
					worst_subject: payload.longitudinal.worst_subject,
					recent_trend: payload.longitudinal.recent_trend,
					timeline
				}
			: null,
		enrollments: payload.enrollments,

		// Novos campos semânticos para o Sprint 1
		currentAverage,
		currentAveragePercent,
		trendDirection,
		trendDirectionRaw: payload.longitudinal?.recent_trend ?? 'insufficient_data',
		topStrength: buildSubjectHighlight(bestSubject),
		topReviewArea: buildSubjectHighlight(prioritySubject),
		recentPublications,
		hasPublishedData:
			payload.portal.status === 'ready' &&
			typeof currentAverage === 'number' &&
			recentPublications.length > 0,
		emptyState: {
			title:
				payload.portal.status === 'pending-link'
					? 'Vincule uma turma para começar'
					: 'Ainda não há publicações suficientes',
			description:
				payload.portal.status === 'pending-link'
					? payload.portal.message
					: 'Assim que houver avaliações publicadas, esta visão mostrará sua situação atual com mais clareza.'
		}
	};
};

export const actions: Actions = {
	claimInviteCode: async ({ request, locals }) => {
		const form = await request.formData();
		const inviteCode = normalizeInviteCode(form.get('invite_code'));

		if (!inviteCode) {
			return fail(400, {
				action: 'claimInviteCode',
				message: 'Informe um código de convite.',
				values: {
					invite_code: ''
				}
			} satisfies ClaimFormState);
		}

		const { error } = await locals.supabase.rpc('claim_student_by_invite_code', {
			p_invite_code: inviteCode
		});

		if (error) {
			return fail(400, {
				action: 'claimInviteCode',
				message: error.message ?? 'Não foi possível vincular este código agora.',
				values: {
					invite_code: inviteCode
				}
			} satisfies ClaimFormState);
		}

		throw redirect(303, '/student');
	}
};
