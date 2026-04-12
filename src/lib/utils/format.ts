const FALLBACK_LABEL = '--';
const DEFAULT_LOCALE = 'pt-BR';

function isValidNumber(value: number | null | undefined): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function formatNumber(
	value: number | null | undefined,
	options: Intl.NumberFormatOptions = {}
): string {
	if (!isValidNumber(value)) return FALLBACK_LABEL;

	return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value);
}

/**
 * Número genérico pt-BR.
 * Use quando o valor não for explicitamente nota ou percentual.
 */
export function formatPtBrNumber(
	value: number | null | undefined,
	options: Intl.NumberFormatOptions = {}
) {
	return formatNumber(value, {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
		...options
	});
}

/**
 * Nota em escala real.
 * Ex.: 7,5
 */
export function formatStudentGrade(value: number | null | undefined, decimals = 1) {
	return formatNumber(value, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
}

/**
 * Nota em escala real com referência de escala.
 * Ex.: 7,5 / 10,0
 */
export function formatStudentGradeWithScale(
	value: number | null | undefined,
	scaleMax: number | null | undefined,
	decimals = 1
) {
	const grade = formatStudentGrade(value, decimals);
	const scale = formatStudentGrade(scaleMax, decimals);

	if (grade === FALLBACK_LABEL) return FALLBACK_LABEL;
	if (scale === FALLBACK_LABEL) return grade;

	return `${grade} / ${scale}`;
}

/**
 * Percentual explícito.
 * Ex.: 82%
 */
export function formatStudentPercent(value: number | null | undefined, decimals = 0) {
	if (!isValidNumber(value)) return FALLBACK_LABEL;

	return `${formatNumber(value, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	})}%`;
}

/**
 * Percentual com API do Intl em estilo percent.
 * Entrada esperada: 82 => "82%"
 */
export function formatStudentPercentIntl(value: number | null | undefined, decimals = 0) {
	if (!isValidNumber(value)) return FALLBACK_LABEL;

	return new Intl.NumberFormat(DEFAULT_LOCALE, {
		style: 'percent',
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value / 100);
}

/**
 * Delta assinado para comparação.
 * Ex.: +3,2 | -1,4
 */
export function formatStudentSignedNumber(value: number | null | undefined, decimals = 1) {
	if (!isValidNumber(value)) return FALLBACK_LABEL;

	const formatted = formatStudentGrade(Math.abs(value), decimals);
	if (formatted === FALLBACK_LABEL) return FALLBACK_LABEL;
	if (value === 0) return formatted;

	return `${value > 0 ? '+' : '-'}${formatted}`;
}

/**
 * Conversão explícita de percentual normalizado para nota em escala real.
 * Ex.: 82% numa escala 0-10 => 8,2
 */
export function formatNormalizedPercentAsGrade(
	percentValue: number | null | undefined,
	decimals = 1,
	scaleMax = 10,
	scaleMin = 0
) {
	if (!isValidNumber(percentValue)) return FALLBACK_LABEL;
	if (!isValidNumber(scaleMax) || !isValidNumber(scaleMin) || scaleMax <= scaleMin) {
		return FALLBACK_LABEL;
	}

	const range = scaleMax - scaleMin;
	const grade = scaleMin + (percentValue / 100) * range;

	return formatStudentGrade(grade, decimals);
}

/* =========================
   Aliases de compatibilidade
   ========================= */

/**
 * @deprecated Prefira formatStudentGrade.
 */
export function formatPtBrGrade(value: number | null | undefined, decimals = 1) {
	return formatStudentGrade(value, decimals);
}

/**
 * @deprecated Prefira formatStudentPercent ou formatStudentPercentIntl.
 */
export function formatPtBrPercent(value: number | null | undefined, decimals = 0) {
	return formatStudentPercentIntl(value, decimals);
}

/**
 * @deprecated Prefira formatStudentPercent.
 */
export function formatPercentLabel(value: number | null | undefined, decimals = 0) {
	return formatStudentPercent(value, decimals);
}

/**
 * @deprecated Prefira formatStudentGradeWithScale.
 */
export function formatGradeWithScale(
	value: number | null | undefined,
	scaleMax: number | null | undefined,
	decimals = 1
) {
	return formatStudentGradeWithScale(value, scaleMax, decimals);
}

/**
 * @deprecated Prefira formatNormalizedPercentAsGrade.
 */
export function formatPercentAsGrade(
	value: number | null | undefined,
	decimals = 1,
	scaleMax = 10
) {
	return formatNormalizedPercentAsGrade(value, decimals, scaleMax, 0);
}

/**
 * @deprecated Prefira formatStudentSignedNumber.
 */
export function formatSignedPtBrNumber(value: number | null | undefined, decimals = 1) {
	return formatStudentSignedNumber(value, decimals);
}
