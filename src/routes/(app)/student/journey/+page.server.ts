import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
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

type RawTimelinePoint = {
	assessment_id: string;
	assessment_title: string;
	assessment_date: string;
	subject_id: string;
	subject_name: string;
	raw_score: number | null;
	normalized_percent: number | null;
	status: 'draft' | 'published';
};

type TrendDirection = 'estável' | 'em melhora' | 'em atenção' | 'base insuficiente';
type EventDirection = 'up' | 'down' | 'flat' | 'insufficient_data';

type JourneyTimelineEvent = {
	assessmentId: string;
	assessmentTitle: string;
	assessmentDate: string;
	subjectId: string;
	subjectName: string;
	rawScore: number | null;
	normalizedPercent: number | null;

	previousEvent: {
		assessmentId: string;
		assessmentTitle: string;
		assessmentDate: string;
		subjectId: string;
		subjectName: string;
		normalizedPercent: number | null;
	} | null;

	previousSubjectEvent: {
		assessmentId: string;
		assessmentTitle: string;
		assessmentDate: string;
		normalizedPercent: number | null;
	} | null;

	runningAverageBefore: number | null;
	runningAverageAfter: number | null;
	impactOnAverage: number | null;

	changeFromPreviousEvent: number | null;
	changeFromPreviousSubjectEvent: number | null;

	eventDirection: EventDirection;
	trendDirection: TrendDirection;

	isTurningPoint: boolean;
	turningPointLabel: string | null;
	comparisonLabel: string;
	impactLabel: string;
};

type JourneySubjectSummary = {
	id: string;
	name: string;
	code: string | null;
	currentAverage: number | null;
	normalizedPercent: number | null;
	trendDirection: TrendDirection;
	publishedAssessments: number;
	latestAssessmentTitle: string | null;
	latestAssessmentDate: string | null;
};

function isNumber(value: number | null | undefined): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function roundTo(value: number, decimals = 1) {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

function compareDateAsc(left: RawTimelinePoint, right: RawTimelinePoint) {
	if (left.assessment_date !== right.assessment_date) {
		return left.assessment_date.localeCompare(right.assessment_date);
	}

	return left.assessment_id.localeCompare(right.assessment_id);
}

function compareDateDesc(left: JourneyTimelineEvent, right: JourneyTimelineEvent) {
	if (left.assessmentDate !== right.assessmentDate) {
		return right.assessmentDate.localeCompare(left.assessmentDate);
	}

	return right.assessmentId.localeCompare(left.assessmentId);
}

function deriveTrendDirection(delta: number | null): TrendDirection {
	if (!isNumber(delta)) return 'base insuficiente';
	if (delta >= 3) return 'em melhora';
	if (delta <= -3) return 'em atenção';
	return 'estável';
}

function deriveEventDirection(delta: number | null): EventDirection {
	if (!isNumber(delta)) return 'insufficient_data';
	if (delta > 0) return 'up';
	if (delta < 0) return 'down';
	return 'flat';
}

function buildComparisonLabel(delta: number | null, hasReference: boolean) {
	if (!hasReference || !isNumber(delta)) {
		return 'Sem evento anterior suficiente para comparação.';
	}

	if (delta >= 3) {
		return `Subiu ${roundTo(delta, 1)} ponto(s) percentuais em relação ao evento anterior.`;
	}

	if (delta <= -3) {
		return `Caiu ${roundTo(Math.abs(delta), 1)} ponto(s) percentuais em relação ao evento anterior.`;
	}

	return 'Manteve estabilidade em relação ao evento anterior.';
}

function buildImpactLabel(impact: number | null) {
	if (!isNumber(impact)) {
		return 'Sem base suficiente para medir impacto na média.';
	}

	if (impact > 0) {
		return `Puxou a média acumulada para cima em ${roundTo(impact, 1)} p.p.`;
	}

	if (impact < 0) {
		return `Puxou a média acumulada para baixo em ${roundTo(Math.abs(impact), 1)} p.p.`;
	}

	return 'Não alterou a média acumulada de forma relevante.';
}

function buildTurningPointLabel(
	currentDirection: EventDirection,
	previousDirection: EventDirection
): string | null {
	const meaningfulDirections: EventDirection[] = ['up', 'down'];

	if (
		!meaningfulDirections.includes(currentDirection) ||
		!meaningfulDirections.includes(previousDirection)
	) {
		return null;
	}

	if (currentDirection === previousDirection) return null;

	if (currentDirection === 'up') {
		return 'Ponto de virada: retomada de melhora.';
	}

	return 'Ponto de virada: início de queda.';
}

function buildJourneyTimeline(timeline: RawTimelinePoint[]): JourneyTimelineEvent[] {
	if (timeline.length === 0) return [];

	const ordered = [...timeline].sort(compareDateAsc);
	const subjectHistory = new Map<string, JourneyTimelineEvent[]>();
	const ascendingEvents: JourneyTimelineEvent[] = [];

	for (let index = 0; index < ordered.length; index += 1) {
		const point = ordered[index];
		const previousEvent = ascendingEvents[index - 1] ?? null;

		const sameSubjectHistory = subjectHistory.get(point.subject_id) ?? [];
		const previousSubjectEvent = sameSubjectHistory[sameSubjectHistory.length - 1] ?? null;

		const previousPercents = ascendingEvents.map((item) => item.normalizedPercent).filter(isNumber);

		const runningAverageBefore =
			previousPercents.length > 0
				? roundTo(
						previousPercents.reduce((sum, value) => sum + value, 0) / previousPercents.length,
						1
					)
				: null;

		const runningAverageAfterValues = [...previousPercents];
		if (isNumber(point.normalized_percent)) {
			runningAverageAfterValues.push(point.normalized_percent);
		}

		const runningAverageAfter =
			runningAverageAfterValues.length > 0
				? roundTo(
						runningAverageAfterValues.reduce((sum, value) => sum + value, 0) /
							runningAverageAfterValues.length,
						1
					)
				: null;

		const changeFromPreviousEvent =
			isNumber(point.normalized_percent) && isNumber(previousEvent?.normalizedPercent)
				? roundTo(point.normalized_percent - previousEvent.normalizedPercent, 1)
				: null;

		const changeFromPreviousSubjectEvent =
			isNumber(point.normalized_percent) && isNumber(previousSubjectEvent?.normalizedPercent)
				? roundTo(point.normalized_percent - previousSubjectEvent.normalizedPercent, 1)
				: null;

		const impactOnAverage =
			isNumber(runningAverageBefore) && isNumber(runningAverageAfter)
				? roundTo(runningAverageAfter - runningAverageBefore, 1)
				: null;

		const eventDirection = deriveEventDirection(changeFromPreviousEvent);
		const trendDirection = deriveTrendDirection(changeFromPreviousEvent);

		const previousDirection = previousEvent?.eventDirection ?? 'insufficient_data';
		const turningPointLabel = buildTurningPointLabel(eventDirection, previousDirection);

		const event: JourneyTimelineEvent = {
			assessmentId: point.assessment_id,
			assessmentTitle: point.assessment_title,
			assessmentDate: point.assessment_date,
			subjectId: point.subject_id,
			subjectName: point.subject_name,
			rawScore: point.raw_score,
			normalizedPercent: point.normalized_percent,

			previousEvent: previousEvent
				? {
						assessmentId: previousEvent.assessmentId,
						assessmentTitle: previousEvent.assessmentTitle,
						assessmentDate: previousEvent.assessmentDate,
						subjectId: previousEvent.subjectId,
						subjectName: previousEvent.subjectName,
						normalizedPercent: previousEvent.normalizedPercent
					}
				: null,

			previousSubjectEvent: previousSubjectEvent
				? {
						assessmentId: previousSubjectEvent.assessmentId,
						assessmentTitle: previousSubjectEvent.assessmentTitle,
						assessmentDate: previousSubjectEvent.assessmentDate,
						normalizedPercent: previousSubjectEvent.normalizedPercent
					}
				: null,

			runningAverageBefore,
			runningAverageAfter,
			impactOnAverage,

			changeFromPreviousEvent,
			changeFromPreviousSubjectEvent,

			eventDirection,
			trendDirection,

			isTurningPoint: turningPointLabel !== null,
			turningPointLabel,
			comparisonLabel: buildComparisonLabel(changeFromPreviousEvent, previousEvent !== null),
			impactLabel: buildImpactLabel(impactOnAverage)
		};

		ascendingEvents.push(event);
		subjectHistory.set(point.subject_id, [...sameSubjectHistory, event]);
	}

	return ascendingEvents.sort(compareDateDesc);
}

export const load: PageServerLoad = async ({ locals, parent, cookies }) => {
	const parentData = (await parent()) as ParentData;

	if (!parentData.authUser?.id) {
		throw redirect(302, '/login');
	}

	const payload = await loadStudentPortalData(locals, parentData, cookies);

	const rawTimeline = (payload.longitudinal?.timeline ?? []) as RawTimelinePoint[];
	const journeyTimeline = buildJourneyTimeline(rawTimeline);

	const subjectOptions: JourneySubjectSummary[] = payload.subjects.map((subject) => ({
		id: subject.id,
		name: subject.name,
		code: subject.code,
		currentAverage: subject.currentAverage,
		normalizedPercent: subject.normalizedPercent,
		trendDirection: subject.trendDirection,
		publishedAssessments: subject.assessmentsCount,
		latestAssessmentTitle: subject.latestAssessmentTitle,
		latestAssessmentDate: subject.latestAssessmentDate
	}));

	const latestEvent = journeyTimeline[0] ?? null;
	const turningPoints = journeyTimeline.filter((event) => event.isTurningPoint);

	return {
		authUser: payload.authUser,
		journeyPortal: payload.portal,
		student: payload.student,
		summary: payload.summary,
		bestSubject: payload.bestSubject
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
					latestAssessmentDate: payload.bestSubject.latestAssessmentDate,
					currentAverage: payload.bestSubject.currentAverage,
					normalizedPercent: payload.bestSubject.normalizedPercent,
					trendDirection: payload.bestSubject.trendDirection,
					subjectStatus: payload.bestSubject.subjectStatus
				}
			: null,
		prioritySubject: payload.prioritySubject
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
					latestAssessmentDate: payload.prioritySubject.latestAssessmentDate,
					currentAverage: payload.prioritySubject.currentAverage,
					normalizedPercent: payload.prioritySubject.normalizedPercent,
					trendDirection: payload.prioritySubject.trendDirection,
					subjectStatus: payload.prioritySubject.subjectStatus
				}
			: null,
		subjects: payload.subjects.map((subject) => ({
			id: subject.id,
			name: subject.name,
			code: subject.code,
			progress: subject.progress,
			score: subject.score,
			status: subject.status,
			description: subject.description,
			assessmentsCount: subject.assessmentsCount,
			latestAssessmentTitle: subject.latestAssessmentTitle,
			latestAssessmentDate: subject.latestAssessmentDate,
			currentAverage: subject.currentAverage,
			normalizedPercent: subject.normalizedPercent,
			trendDirection: subject.trendDirection,
			subjectStatus: subject.subjectStatus
		})),
		academicSummary: payload.academicSummary,
		longitudinal: payload.longitudinal,
		enrollments: payload.enrollments,

		journeySummary: {
			totalEvents: journeyTimeline.length,
			turningPointsCount: turningPoints.length,
			latestEventTrend: latestEvent?.trendDirection ?? 'base insuficiente',
			latestEventImpactOnAverage: latestEvent?.impactOnAverage ?? null,
			latestEventSubjectId: latestEvent?.subjectId ?? null,
			latestEventSubjectName: latestEvent?.subjectName ?? null
		},
		subjectOptions,
		timelineEvents: journeyTimeline
	};
};
