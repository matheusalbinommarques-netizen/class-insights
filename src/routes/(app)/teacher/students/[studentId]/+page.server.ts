import type { PageServerLoad } from './$types';
import { getAuthenticatedUserId } from '$lib/server/auth';
import { loadStudentLongitudinalProfile } from '$lib/server/student-longitudinal-profile';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = getAuthenticatedUserId(locals);

	if (!userId) {
		return {
			student: null,
			classroom: null,
			longitudinal: null,
			summary: null,
			subjects: [],
			timeline: [],
			error: 'Sessao invalida. Faca login novamente.'
		};
	}

	const result = await loadStudentLongitudinalProfile(locals, {
		kind: 'teacher',
		teacherUserId: userId,
		studentId: params.studentId
	});

	if (!result.ok) {
		return {
			student: null,
			classroom: null,
			longitudinal: null,
			summary: null,
			subjects: [],
			timeline: [],
			error: result.message
		};
	}

	const profile = result.profile;

	return {
		student: {
			id: profile.student.id,
			name: profile.student.displayName
		},
		classroom: profile.classroom,
		longitudinal: profile.longitudinal,
		summary: {
			publishedAssessments: profile.summary.publishedAssessments,
			subjectsCount: profile.summary.totalSubjects,
			studentAverage: profile.summary.generalPercent,
			classAverage: profile.summary.classAveragePercent,
			gapPercent: profile.summary.gapPercent
		},
		subjects: profile.subjects.map((subject) => ({
			subjectId: subject.id,
			subjectName: subject.name,
			assessmentsCount: subject.assessmentsCount,
			studentAverage: subject.progress,
			classAverage: subject.classAverage,
			gapPercent: subject.gapPercent,
			recentTrend: subject.recentTrend,
			latestAssessmentDate: subject.latestAssessmentDate,
			latestAssessmentTitle: subject.latestAssessmentTitle
		})),
		timeline: profile.timeline.map((point) => ({
			assessmentId: point.assessmentId,
			assessmentTitle: point.assessmentTitle,
			assessmentDate: point.assessmentDate,
			subjectId: point.subjectId,
			subjectName: point.subjectName,
			studentPercent: point.studentPercent,
			classAveragePercent: point.classAveragePercent,
			gapPercent: point.gapPercent
		})),
		error: null
	};
};
