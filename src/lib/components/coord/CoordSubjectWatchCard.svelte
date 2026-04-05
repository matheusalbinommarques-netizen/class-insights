<script lang="ts">
	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

	export let subject: {
		subjectId: string;
		subjectName: string;
		averageLabel: string;
		assessmentsCount: number;
		recentTrend: Trend;
		primaryReason?: string;
		detailHref?: string;
	};

	const trendLabel = (trend: Trend) => {
		if (trend === 'declining') return 'Em queda';
		if (trend === 'improving') return 'Em melhora';
		if (trend === 'stable') return 'Estável';
		return 'Base insuficiente';
	};

	const trendClass = (trend: Trend) => {
		if (trend === 'declining') return 'border-red-200 bg-red-50 text-red-700';
		if (trend === 'improving') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (trend === 'stable') return 'border-sky-200 bg-sky-50 text-sky-700';
		return 'border-slate-200 bg-slate-50 text-slate-600';
	};
</script>

<article class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
	<div class="flex items-start justify-between gap-3">
		<h4 class="text-lg font-black tracking-tight text-slate-950">{subject.subjectName}</h4>
		<span
			class={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${trendClass(subject.recentTrend)}`}
		>
			{trendLabel(subject.recentTrend)}
		</span>
	</div>

	{#if subject.primaryReason}
		<p class="mt-3 text-sm leading-6 text-slate-600">{subject.primaryReason}</p>
	{/if}

	<p class="mt-3 text-sm text-slate-600">
		Média publicada: <strong class="text-slate-900">{subject.averageLabel} / 10</strong>
	</p>

	<div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
		<p class="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
			Publicações no escopo
		</p>
		<p class="mt-2 text-2xl font-black tracking-tight text-slate-950">
			{subject.assessmentsCount}
		</p>
	</div>

	{#if subject.detailHref}
		<div class="mt-4 flex justify-end">
			<a
				href={subject.detailHref}
				class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
			>
				Ver matéria
			</a>
		</div>
	{/if}
</article>
