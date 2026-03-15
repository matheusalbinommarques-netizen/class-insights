import type { PageServerLoad } from './$types';

import { buildTeacherDashboardPageData } from '$lib/server/teacher-dashboard';
import type {
	TeacherDashboardClassSummaryItem,
	TeacherDashboardPageData,
	TeacherDashboardRiskTone
} from '$lib/types/teacher';

type SummaryMetricTone = 'neutral' | 'attention' | 'critical';

type SummaryMetric = {
	label: string;
	value: string;
	tone: SummaryMetricTone;
};

export type TeacherClassesPageData = {
	teacherName: string;
	syncLabel: string;
	error: string | null;
	classesSummary: TeacherDashboardClassSummaryItem[];
	urgentClasses: TeacherDashboardClassSummaryItem[];
	summaryMetrics: SummaryMetric[];
};

function parsePtBrNumber(raw: string) {
	const normalized = raw.replace(/\s+/g, '').replace(',', '.');
	const value = Number(normalized);
	return Number.isFinite(value) ? value : null;
}

function parsePublishedAverage(label: string) {
	const [rawAverage] = label.split('/');
	return parsePtBrNumber((rawAverage ?? '').trim());
}

function parseCoverage(label: string) {
	const normalized = label.replace('%', '').trim();
	const value = Number(normalized);
	return Number.isFinite(value) ? value : null;
}

function parseTrend(label: string) {
	if (!label || label.trim().toLowerCase() === 'estavel') return 0;
	return parsePtBrNumber(label.replace('+', '').trim()) ?? 0;
}

function formatPtBr(value: number, decimals = 1) {
	return new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}

function metricToneByCount(count: number): SummaryMetricTone {
	if (count > 0) return 'attention';
	return 'neutral';
}

function severityRank(statusTone: TeacherDashboardRiskTone) {
	if (statusTone === 'critical') return 0;
	if (statusTone === 'attention') return 1;
	return 2;
}

function sortByPriority(a: TeacherDashboardClassSummaryItem, b: TeacherDashboardClassSummaryItem) {
	const severityDiff = severityRank(a.statusTone) - severityRank(b.statusTone);
	if (severityDiff !== 0) return severityDiff;

	const trendA = parseTrend(a.trendLabel);
	const trendB = parseTrend(b.trendLabel);

	if (trendA !== trendB) return trendA - trendB;

	const coverageA = parseCoverage(a.coverageLabel) ?? 0;
	const coverageB = parseCoverage(b.coverageLabel) ?? 0;

	if (coverageA !== coverageB) return coverageA - coverageB;

	return a.className.localeCompare(b.className, 'pt-BR');
}

function buildClassesPageData(dashboard: TeacherDashboardPageData): TeacherClassesPageData {
	const classesSummary = [...dashboard.classesSummary];
	const activeClasses = classesSummary.length;

	const averageValues = classesSummary
		.map((item) => parsePublishedAverage(item.publishedAverageLabel))
		.filter((value): value is number => value !== null);

	const coverageValues = classesSummary
		.map((item) => parseCoverage(item.coverageLabel))
		.filter((value): value is number => value !== null);

	const averagePublished =
		averageValues.length > 0
			? averageValues.reduce((sum, value) => sum + value, 0) / averageValues.length
			: null;

	const averageCoverage =
		coverageValues.length > 0
			? Math.round(coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length)
			: null;

	const attentionClasses = classesSummary.filter((item) => item.statusTone === 'attention').length;
	const criticalClasses = classesSummary.filter((item) => item.statusTone === 'critical').length;

	const urgentClasses = [...classesSummary]
		.filter((item) => item.statusTone !== 'neutral' || parseTrend(item.trendLabel) < 0)
		.sort(sortByPriority)
		.slice(0, 2);

	const summaryMetrics: SummaryMetric[] = [
		{
			label: 'Turmas ativas',
			value: String(activeClasses),
			tone: 'neutral'
		},
		{
			label: 'Média geral',
			value: averagePublished === null ? '--' : `${formatPtBr(averagePublished)} / 10`,
			tone: 'neutral'
		},
		{
			label: 'Cobertura média',
			value: averageCoverage === null ? '--' : `${averageCoverage}%`,
			tone: 'neutral'
		},
		{
			label: 'Turmas em atenção',
			value: String(attentionClasses),
			tone: metricToneByCount(attentionClasses)
		},
		{
			label: 'Turmas em risco',
			value: String(criticalClasses),
			tone: criticalClasses > 0 ? 'critical' : 'neutral'
		}
	];

	return {
		teacherName: dashboard.teacherName,
		syncLabel: dashboard.syncLabel,
		error: dashboard.error,
		classesSummary,
		urgentClasses,
		summaryMetrics
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const dashboard = await buildTeacherDashboardPageData(locals);
	return buildClassesPageData(dashboard);
};
