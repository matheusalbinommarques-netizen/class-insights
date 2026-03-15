<script lang="ts">
	import type { TeacherSubjectsSummaryMetric } from '$lib/types/teacher';

	type Props = {
		metrics: TeacherSubjectsSummaryMetric[];
	};

	let { metrics }: Props = $props();

	function panelClass(tone: TeacherSubjectsSummaryMetric['tone']) {
		if (tone === 'critical') return 'border-red-200 bg-red-50';
		if (tone === 'attention') return 'border-amber-200 bg-amber-50';
		if (tone === 'positive') return 'border-emerald-200 bg-emerald-50';
		return 'border-slate-200 bg-white';
	}

	function valueClass(tone: TeacherSubjectsSummaryMetric['tone']) {
		if (tone === 'critical') return 'text-red-600';
		if (tone === 'attention') return 'text-amber-600';
		if (tone === 'positive') return 'text-emerald-600';
		return 'text-slate-950';
	}
</script>

<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
	<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
		{#each metrics as metric (`${metric.label}-${metric.value}`)}
			<div class={`rounded-2xl border p-4 ${panelClass(metric.tone)}`}>
				<p class={`text-[2rem] font-black tracking-tight ${valueClass(metric.tone)}`}>
					{metric.value}
				</p>
				<p class="mt-2 text-sm font-bold text-slate-700">
					{metric.label}
				</p>
			</div>
		{/each}
	</div>
</section>
