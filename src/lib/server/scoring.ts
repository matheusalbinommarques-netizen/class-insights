export type ScaleConfig = {
	min: number;
	max: number;
	decimals: number;
};

export type ClassScaleSource = {
	score_min: number;
	score_max: number;
	score_decimals: number;
};

export type SkillScaleSource = {
	score_min: number | null;
	score_max: number | null;
	score_decimals: number | null;
};

export type ScoreValidationResult =
	| {
			ok: true;
			value: number;
			scale: ScaleConfig;
	  }
	| {
			ok: false;
			message: string;
			scale: ScaleConfig;
	  };

const MAX_ALLOWED_DECIMALS = 6;

function normalizeWhitespace(value: string): string {
	return value.trim().replace(/\s+/g, ' ');
}

function stripDiacritics(value: string): string {
	return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeTextForMatch(value: string | null | undefined): string {
	return stripDiacritics(normalizeWhitespace(String(value ?? ''))).toLowerCase();
}

export function normalizeNumericString(raw: string | null | undefined): string {
	const value = String(raw ?? '')
		.trim()
		.replace(/\s+/g, '');

	if (!value) return '';

	const hasComma = value.includes(',');
	const hasDot = value.includes('.');

	if (hasComma && hasDot) {
		const lastComma = value.lastIndexOf(',');
		const lastDot = value.lastIndexOf('.');

		// Ex.: 1.234,56 -> remove pontos e usa vírgula como decimal
		if (lastComma > lastDot) {
			return value.replace(/\./g, '').replace(',', '.');
		}

		// Ex.: 1,234.56 -> remove vírgulas e mantém ponto como decimal
		return value.replace(/,/g, '');
	}

	if (hasComma) {
		return value.replace(',', '.');
	}

	return value;
}

export function parseNumericInput(raw: string): number | null {
	const normalized = normalizeNumericString(raw);
	if (!normalized) return null;

	const n = Number(normalized);
	return Number.isFinite(n) ? n : null;
}

export function countDecimals(raw: string): number {
	const normalized = normalizeNumericString(raw);
	if (!normalized) return 0;

	const idx = normalized.indexOf('.');
	return idx === -1 ? 0 : normalized.length - idx - 1;
}

export function isBlank(raw: string | null | undefined): boolean {
	return String(raw ?? '').trim().length === 0;
}

export function normalizeSkillName(name: string): string {
	return normalizeTextForMatch(name);
}

export function resolveEffectiveScale(
	classScale: ClassScaleSource,
	skillScale?: SkillScaleSource | null
): ScaleConfig {
	return {
		min: skillScale?.score_min ?? classScale.score_min,
		max: skillScale?.score_max ?? classScale.score_max,
		decimals: skillScale?.score_decimals ?? classScale.score_decimals
	};
}

export function validateScaleConfig(scale: ScaleConfig): string | null {
	if (!Number.isFinite(scale.min) || !Number.isFinite(scale.max)) {
		return 'Escala inválida.';
	}

	if (!(scale.max > scale.min)) {
		return 'Escala inválida: max precisa ser maior que min.';
	}

	if (
		!Number.isInteger(scale.decimals) ||
		scale.decimals < 0 ||
		scale.decimals > MAX_ALLOWED_DECIMALS
	) {
		return `Decimais inválidos (0 a ${MAX_ALLOWED_DECIMALS}).`;
	}

	return null;
}

export function validateScoreInput(
	raw: string,
	scale: ScaleConfig,
	options?: {
		allowBlank?: boolean;
	}
): ScoreValidationResult {
	const allowBlank = options?.allowBlank ?? true;

	if (isBlank(raw)) {
		if (allowBlank) {
			return {
				ok: false,
				message: 'EMPTY',
				scale
			};
		}

		return {
			ok: false,
			message: 'Nota obrigatória.',
			scale
		};
	}

	const scaleError = validateScaleConfig(scale);
	if (scaleError) {
		return {
			ok: false,
			message: scaleError,
			scale
		};
	}

	const value = parseNumericInput(raw);

	if (value === null) {
		return {
			ok: false,
			message: 'Nota inválida.',
			scale
		};
	}

	if (value < scale.min || value > scale.max) {
		return {
			ok: false,
			message: `Fora do range (${scale.min}–${scale.max}).`,
			scale
		};
	}

	if (countDecimals(raw) > scale.decimals) {
		return {
			ok: false,
			message: `Muitas casas decimais (máx ${scale.decimals}).`,
			scale
		};
	}

	return {
		ok: true,
		value,
		scale
	};
}
