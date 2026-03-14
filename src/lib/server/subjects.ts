import { isMissingRelationError } from './assessments.ts';

export type SubjectInput = {
	name: string;
	code?: string | null;
};

export type ClassSubjectLinkInput = {
	class_id: string;
	subject_id: string;
	teacher_id: string;
};

export type SubjectValidationResult =
	| {
			ok: true;
			value: SubjectInput;
	  }
	| {
			ok: false;
			message: string;
	  };

export type ClassSubjectLinkValidationResult =
	| {
			ok: true;
			value: ClassSubjectLinkInput;
	  }
	| {
			ok: false;
			message: string;
	  };

export function normalizeSubjectName(value: string): string {
	return value.trim().replace(/\s+/g, ' ');
}

export function normalizeSubjectCode(value: string | null | undefined): string | null {
	const normalized = String(value ?? '')
		.trim()
		.toUpperCase()
		.replace(/\s+/g, ' ');

	return normalized || null;
}

export function validateSubjectInput(input: SubjectInput): SubjectValidationResult {
	const name = normalizeSubjectName(input.name);
	const code = normalizeSubjectCode(input.code);

	if (!name) {
		return { ok: false, message: 'Nome da materia obrigatorio.' };
	}

	return {
		ok: true,
		value: {
			name,
			code
		}
	};
}

export function validateClassSubjectLinkInput(
	input: ClassSubjectLinkInput
): ClassSubjectLinkValidationResult {
	if (!input.class_id.trim()) {
		return { ok: false, message: 'class_id obrigatorio.' };
	}

	if (!input.subject_id.trim()) {
		return { ok: false, message: 'subject_id obrigatorio.' };
	}

	if (!input.teacher_id.trim()) {
		return { ok: false, message: 'teacher_id obrigatorio.' };
	}

	return {
		ok: true,
		value: input
	};
}

export function buildSubjectsSchemaMessage(
	error: {
		code?: string;
		message?: string;
		details?: string;
	} | null
): string {
	if (isMissingRelationError(error)) {
		return 'O schema academico da V1 ainda nao esta disponivel neste ambiente. As tabelas de subjects e class_subjects precisam existir para esta area funcionar.';
	}

	return error?.message ?? 'Nao foi possivel carregar a area de materias.';
}
