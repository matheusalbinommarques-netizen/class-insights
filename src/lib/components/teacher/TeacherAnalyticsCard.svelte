<script lang="ts">
	import type { TeacherDashboardAnalyticsSummary } from '$lib/types/teacher';

	type Props = {
		analyticsSummary: TeacherDashboardAnalyticsSummary;
	};

	let { analyticsSummary }: Props = $props();

	function bucketBarClass(label: string) {
		if (label === 'Abaixo 5') return 'bg-red-500';
		if (label === '5-7') return 'bg-amber-400';
		if (label === '7-9') return 'bg-emerald-500';
		return 'bg-blue-600';
	}
</script>

<aside class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
	<div class="flex items-center justify-between gap-3">
		<h2 class="text-2xl font-black tracking-tight text-slate-950">Resumo analitico</h2>

		<button
			type="button"
			class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
		>
			{analyticsSummary.rangeLabel}
		</button>
	</div>

	<div class="mt-6">
		<div class="flex h-56 items-end gap-4">
			{#each analyticsSummary.buckets as bucket (bucket.label)}
				<div class="flex flex-1 flex-col items-center gap-3">
					<div class="text-sm font-bold text-slate-500">{bucket.value}</div>
					<div class="flex h-44 w-full items-end rounded-2xl bg-slate-50 px-2 pb-2">
						<div
							class={`w-full rounded-t-xl ${bucketBarClass(bucket.label)}`}
							style={`height: ${bucket.heightPercent}%`}
						></div>
					</div>
					<span class="text-center text-sm font-semibold text-slate-600">{bucket.label}</span>
				</div>
			{/each}
		</div>
	</div>
</aside>
