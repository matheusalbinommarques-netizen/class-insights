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

export function formatPercentAsGrade(value: number | null | undefined, decimals = 1) {
	if (typeof value !== 'number' || Number.isNaN(value)) return '--';

	return formatPtBrGrade(value / 10, decimals);
}
