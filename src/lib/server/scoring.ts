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

export function parseNumericInput(raw: string): number | null {
	const value = String(raw ?? '').trim();
	if (!value) return null;

	const normalized = value.replace(',', '.');
	const n = Number(normalized);

	return Number.isNaN(n) ? null : n;
}

export function countDecimals(raw: string): number {
	const value = String(raw ?? '').trim().replace(',', '.');
	const idx = value.indexOf('.');

	return idx === -1 ? 0 : value.length - idx - 1;
}

export function isBlank(raw: string | null | undefined): boolean {
	return String(raw ?? '').trim().length === 0;
}

export function normalizeSkillName(name: string): string {
	return String(name ?? '').trim().toLowerCase();
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

	if (!Number.isInteger(scale.decimals) || scale.decimals < 0 || scale.decimals > 6) {
		return 'Decimais inválidos (0 a 6).';
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