import type { Assessment, AssessmentResult, PublicationStatus } from '$lib/types/academic';

export function isPublished(status: PublicationStatus): boolean {
	return status === 'published';
}

export function getVisibleResultsForStudent<T extends AssessmentResult>(
	results: T[],
	assessmentsById: Map<string, Pick<Assessment, 'id' | 'status'>>
): T[] {
	return results.filter((result) => {
		const assessment = assessmentsById.get(result.assessment_id);
		return assessment?.status === 'published';
	});
}

export function buildPublicationMetadata(
	userId: string,
	at = new Date()
): {
	status: PublicationStatus;
	published_at: string;
	published_by: string;
} {
	return {
		status: 'published',
		published_at: at.toISOString(),
		published_by: userId
	};
}

export function buildAssessmentRevisionTitle(title: string): string {
	const normalized = title.trim().replace(/\s+/g, ' ');
	if (!normalized) return 'Correcao';
	if (normalized.toLocaleLowerCase('pt-BR').includes('correcao')) return normalized;
	return `${normalized} - Correcao`;
}
