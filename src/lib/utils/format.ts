export function formatPtBrNumber(
	value: number | null | undefined,
	options: Intl.NumberFormatOptions = {}
) {
	if (typeof value !== 'number' || Number.isNaN(value)) return '--';

	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
		...options
	}).format(value);
}

export function formatPtBrGrade(value: number | null | undefined, decimals = 1) {
	return formatPtBrNumber(value, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
}

export function formatPtBrPercent(value: number | null | undefined, decimals = 0) {
	if (typeof value !== 'number' || Number.isNaN(value)) return '--';

	return new Intl.NumberFormat('pt-BR', {
		style: 'percent',
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value / 100);
}

export function formatPercentLabel(value: number | null | undefined, decimals = 0) {
	if (typeof value !== 'number' || Number.isNaN(value)) return '--';
	return `${formatPtBrNumber(value, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	})}%`;
}

export function formatGradeWithScale(
	value: number | null | undefined,
	scaleMax: number | null | undefined,
	decimals = 1
) {
	const grade = formatPtBrGrade(value, decimals);
	const scale = formatPtBrGrade(scaleMax, decimals);

	if (grade === '--') return '--';
	if (scale === '--') return grade;

	return `${grade} / ${scale}`;
}

export function formatPercentAsGrade(
	value: number | null | undefined,
	decimals = 1,
	scaleMax = 10
) {
	if (typeof value !== 'number' || Number.isNaN(value)) return '--';

	return formatPtBrGrade((value / 100) * scaleMax, decimals);
}

export function formatSignedPtBrNumber(value: number | null | undefined, decimals = 1) {
	if (typeof value !== 'number' || Number.isNaN(value)) return '--';

	const formatted = formatPtBrGrade(Math.abs(value), decimals);
	if (formatted === '--') return '--';
	if (value === 0) return formatted;

	return `${value > 0 ? '+' : '-'}${formatted}`;
}
