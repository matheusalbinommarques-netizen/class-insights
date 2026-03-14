import type { Assessment, PublicationStatus } from '$lib/types/academic';
import { validateScoreInput } from './scoring.ts';

export type AssessmentInput = {
	class_id: string;
	subject_id: string;
	title: string;
	assessment_date: string;
	weight: number;
	status?: PublicationStatus;
};

export type AssessmentValidationResult =
	| {
			ok: true;
			value: AssessmentInput;
	  }
	| {
			ok: false;
			message: string;
	  };

export function normalizeAssessmentTitle(value: string): string {
	return value.trim().replace(/\s+/g, ' ');
}

export function validateAssessmentInput(input: AssessmentInput): AssessmentValidationResult {
	const title = normalizeAssessmentTitle(input.title);

	if (!input.class_id.trim()) {
		return { ok: false, message: 'class_id obrigatorio.' };
	}

	if (!input.subject_id.trim()) {
		return { ok: false, message: 'subject_id obrigatorio.' };
	}

	if (!title) {
		return { ok: false, message: 'Titulo da avaliacao obrigatorio.' };
	}

	if (!input.assessment_date.trim()) {
		return { ok: false, message: 'Data da avaliacao obrigatoria.' };
	}

	if (!Number.isFinite(input.weight) || input.weight <= 0) {
		return { ok: false, message: 'Peso da avaliacao deve ser maior que zero.' };
	}

	return {
		ok: true,
		value: {
			...input,
			title,
			status: input.status ?? 'draft'
		}
	};
}

export function canEditAssessment(assessment: Pick<Assessment, 'status'>): boolean {
	return assessment.status === 'draft';
}

export function canPublishAssessment(
	assessment: Pick<Assessment, 'status'>,
	options: { hasResults: boolean }
): { ok: true } | { ok: false; message: string } {
	if (assessment.status === 'published') {
		return { ok: false, message: 'Avaliacao ja publicada.' };
	}

	if (!options.hasResults) {
		return { ok: false, message: 'Nao e possivel publicar uma avaliacao sem resultados.' };
	}

	return { ok: true };
}

export function isMissingRelationError(
	error:
		| {
				code?: string;
				message?: string;
				details?: string;
		  }
		| null
		| undefined
): boolean {
	if (!error) return false;

	if (error.code === '42P01') return true;

	const combined = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
	return combined.includes('relation') && combined.includes('does not exist');
}

export type AssessmentResultDraftInput = {
	raw_score: string;
	score_min: number;
	score_max: number;
	score_decimals: number;
	is_excused: boolean;
	notes: string | null;
};

export type AssessmentResultDraftValidationResult =
	| {
			ok: true;
			value: {
				raw_score: number | null;
				score_min: number;
				score_max: number;
				score_decimals: number;
				is_excused: boolean;
				notes: string | null;
				shouldDelete: boolean;
			};
	  }
	| {
			ok: false;
			message: string;
	  };

export function normalizeAssessmentNotes(value: string | null | undefined): string | null {
	const normalized = String(value ?? '')
		.trim()
		.replace(/\s+/g, ' ');
	return normalized || null;
}

export function validateAssessmentResultDraft(
	input: AssessmentResultDraftInput
): AssessmentResultDraftValidationResult {
	const notes = normalizeAssessmentNotes(input.notes);
	const raw = String(input.raw_score ?? '').trim();

	if (!raw) {
		return {
			ok: true,
			value: {
				raw_score: null,
				score_min: input.score_min,
				score_max: input.score_max,
				score_decimals: input.score_decimals,
				is_excused: input.is_excused,
				notes,
				shouldDelete: !input.is_excused && notes === null
			}
		};
	}

	const validation = validateScoreInput(raw, {
		min: input.score_min,
		max: input.score_max,
		decimals: input.score_decimals
	});

	if (!validation.ok) {
		return {
			ok: false,
			message: validation.message
		};
	}

	return {
		ok: true,
		value: {
			raw_score: validation.value,
			score_min: input.score_min,
			score_max: input.score_max,
			score_decimals: input.score_decimals,
			is_excused: input.is_excused,
			notes,
			shouldDelete: false
		}
	};
}
