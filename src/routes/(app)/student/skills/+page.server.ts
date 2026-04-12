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

type TrendDirection = 'estável' | 'em melhora' | 'em atenção' | 'base insuficiente';
type SubjectSituation = 'saudável' | 'em atenção' | 'base insuficiente';

type SubjectSkillCard = {
	id: string;
	name: string;
	code: string | null;

	// compatibilidade com a tela antiga
	score: number | null;
	progress: number | null;
	status: 'good' | 'attention' | 'pending';
	description: string;

	// camada semântica nova
	currentAverage: number | null;
	normalizedPercent: number | null;
	trendDirection: TrendDirection;
	subjectStatus: SubjectSituation;

	publishedAssessments: number;
	latestPublication: {
		title: string | null;
		date: string | null;
	};
};

function buildStatusLabel(status: SubjectSituation) {
	if (status === 'saudável') return 'saudável';
	if (status === 'em atenção') return 'em atenção';
	return 'base insuficiente';
}

function buildSubjectNarrative(subject: SubjectSkillCard) {
	const latestReference = subject.latestPublication.title
		? ` Última publicação: ${subject.latestPublication.title}.`
		: '';

	if (subject.subjectStatus === 'base insuficiente') {
		return `Ainda não há base publicada suficiente para interpretar esta matéria.${latestReference}`;
	}

	if (subject.subjectStatus === 'saudável' && subject.trendDirection === 'em melhora') {
		return `Esta matéria está saudável e em melhora.${latestReference}`;
	}

	if (subject.subjectStatus === 'saudável' && subject.trendDirection === 'estável') {
		return `Esta matéria está saudável e estável.${latestReference}`;
	}

	if (subject.subjectStatus === 'em atenção' && subject.trendDirection === 'em atenção') {
		return `Esta matéria pede atenção e mostra queda recente.${latestReference}`;
	}

	if (subject.subjectStatus === 'em atenção') {
		return `Esta matéria pede atenção no momento.${latestReference}`;
	}

	return `Esta matéria está ${buildStatusLabel(subject.subjectStatus)}.${latestReference}`;
}

export const load: PageServerLoad = async ({ locals, parent, cookies }) => {
	const parentData = (await parent()) as ParentData;

	if (!parentData.authUser?.id) {
		throw redirect(302, '/login');
	}

	const payload = await loadStudentPortalData(locals, parentData, cookies);

	const subjects = payload.subjects
		.map(
			(subject): SubjectSkillCard => ({
				id: subject.id,
				name: subject.name,
				code: subject.code,

				// compatibilidade
				score: subject.score,
				progress: subject.progress,
				status: subject.status,
				description: subject.description,

				// semântica nova
				currentAverage: subject.currentAverage,
				normalizedPercent: subject.normalizedPercent,
				trendDirection: subject.trendDirection,
				subjectStatus: subject.subjectStatus,

				publishedAssessments: subject.assessmentsCount,
				latestPublication: {
					title: subject.latestAssessmentTitle,
					date: subject.latestAssessmentDate
				}
			})
		)
		.sort((a, b) => {
			const rank = {
				'em atenção': 0,
				'base insuficiente': 1,
				saudável: 2
			} as const;

			const statusDiff = rank[a.subjectStatus] - rank[b.subjectStatus];
			if (statusDiff !== 0) return statusDiff;

			return a.name.localeCompare(b.name, 'pt-BR');
		});

	const highlightedStrength =
		subjects.find((subject) => subject.subjectStatus === 'saudável') ?? null;

	const highlightedReview =
		subjects.find((subject) => subject.subjectStatus === 'em atenção') ?? null;

	return {
		authUser: payload.authUser,
		subjectsPortal: payload.portal,
		student: payload.student,
		summary: payload.summary,

		bestSubject: highlightedStrength
			? {
					id: highlightedStrength.id,
					name: highlightedStrength.name,
					code: highlightedStrength.code,
					currentAverage: highlightedStrength.currentAverage,
					normalizedPercent: highlightedStrength.normalizedPercent,
					trendDirection: highlightedStrength.trendDirection,
					subjectStatus: highlightedStrength.subjectStatus,
					description: buildSubjectNarrative(highlightedStrength),
					latestPublication: highlightedStrength.latestPublication
				}
			: null,

		prioritySubject: highlightedReview
			? {
					id: highlightedReview.id,
					name: highlightedReview.name,
					code: highlightedReview.code,
					currentAverage: highlightedReview.currentAverage,
					normalizedPercent: highlightedReview.normalizedPercent,
					trendDirection: highlightedReview.trendDirection,
					subjectStatus: highlightedReview.subjectStatus,
					description: buildSubjectNarrative(highlightedReview),
					latestPublication: highlightedReview.latestPublication
				}
			: null,

		subjects,

		subjectsSummary: {
			totalSubjects: subjects.length,
			healthySubjects: subjects.filter((subject) => subject.subjectStatus === 'saudável').length,
			attentionSubjects: subjects.filter((subject) => subject.subjectStatus === 'em atenção')
				.length,
			insufficientBaseSubjects: subjects.filter(
				(subject) => subject.subjectStatus === 'base insuficiente'
			).length
		},

		academicSummary: payload.academicSummary,
		longitudinal: payload.longitudinal,
		enrollments: payload.enrollments
	};
};
