<script lang="ts">
	import type {
		TeacherDashboardClassSummaryItem,
		TeacherDashboardRiskTone,
		TeacherDashboardTrendTone
	} from '$lib/types/teacher';

	type Props = {
		classItem: TeacherDashboardClassSummaryItem;
	};

	let { classItem }: Props = $props();

	const axisLevels = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

	function trendClass(trendTone: TeacherDashboardTrendTone) {
		if (trendTone === 'negative') return 'text-red-600';
		if (trendTone === 'positive') return 'text-emerald-600';
		return 'text-slate-500';
	}

	function statusIndicatorClass(statusTone: TeacherDashboardRiskTone) {
		if (statusTone === 'critical') return 'bg-red-500';
		if (statusTone === 'attention') return 'bg-amber-400';
		return 'bg-slate-300';
	}

	function tagClass(index: number) {
		const classes = [
			'bg-emerald-600 text-white',
			'bg-sky-600 text-white',
			'bg-teal-600 text-white',
			'bg-slate-400 text-white'
		];

		return classes[index % classes.length];
	}

	function bucketBarClass(label: string) {
		if (label === 'Abaixo 5') return 'bg-red-500';
		if (label === '5-7') return 'bg-amber-400';
		if (label === '7-9') return 'bg-emerald-500';
		return 'bg-sky-500';
	}

	function bucketHeightPercent(value: number) {
		if (value <= 0) return 0;

		const cappedValue = Math.min(value, 10);
		const percent = (cappedValue / 10) * 100;

		return Math.max(percent, 8);
	}
</script>

<article class="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
	<div class="flex items-start justify-between gap-4">
		<h3
			class="max-w-[16ch] text-[1.75rem] font-extrabold leading-[1.05] tracking-tight text-slate-950"
		>
			{classItem.className}
		</h3>

		<div class="flex items-center gap-2 pt-1">
			<span class={`h-3 w-3 rounded-full ${statusIndicatorClass(classItem.statusTone)}`}></span>

			<svg
				class="h-5 w-5 text-slate-700"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
				/>
				<circle cx="10" cy="7" r="4" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M20 8v6M23 11h-6" />
			</svg>
		</div>
	</div>

	<div class="mt-4 grid grid-cols-3 gap-3">
		<div>
			<p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
				Média publicada
			</p>
			<p class="mt-2 text-[1.1rem] font-semibold text-slate-950">
				<span class="text-[2rem] font-extrabold tracking-tight text-slate-950">
					{classItem.publishedAverageLabel.split(' / ')[0]}
				</span>
				<span class="ml-1 text-[1.1rem] font-medium text-slate-700">/ 10</span>
			</p>
		</div>

		<div>
			<p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
				Cobertura
			</p>
			<p class="mt-2 text-[2rem] font-extrabold tracking-tight text-slate-950">
				{classItem.coverageLabel}
			</p>
		</div>

		<div>
			<p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
				Tendência
			</p>
			<p
				class={`mt-2 text-[2rem] font-extrabold tracking-tight ${trendClass(classItem.trendTone)}`}
			>
				{classItem.trendLabel}
			</p>
		</div>
	</div>

	{#if classItem.tags.length > 0}
		<div class="mt-4 flex flex-wrap gap-2">
			{#each classItem.tags as tag, index (tag)}
				<span
					class={`inline-flex h-8 items-center justify-center rounded-xl px-3 text-sm font-semibold ${tagClass(index)}`}
				>
					{tag}
				</span>
			{/each}
		</div>
	{/if}

	<div class="mt-4 rounded-2xl bg-white/70 px-3 py-3">
		<div class="mb-3">
			<p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
				Resumo analítico da turma
			</p>
		</div>

		<div class="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
			<div class="grid h-40 grid-rows-10">
				{#each axisLevels as level (level)}
					<div class="relative">
						<span
							class="absolute right-0 -top-2 text-[10px] font-semibold leading-none text-slate-400"
						>
							{level}
						</span>
					</div>
				{/each}
			</div>

			<div class="min-w-0">
				<div class="relative h-40">
					<div class="absolute inset-0 grid grid-rows-10">
						{#each axisLevels as level (level)}
							<div class="border-t border-dashed border-slate-200"></div>
						{/each}
					</div>

					<div class="relative z-10 flex h-full items-end gap-3 px-1">
						{#each classItem.analyticsSummary.buckets as bucket (bucket.label)}
							<div class="flex flex-1 flex-col items-center justify-end">
								<div class="flex h-full w-full items-end">
									<div
										class={`w-full rounded-t-lg ${bucketBarClass(bucket.label)}`}
										style={`height: ${bucketHeightPercent(bucket.value)}%`}
										aria-label={`${bucket.label}: ${bucket.value}`}
										title={`${bucket.label}: ${bucket.value}`}
									></div>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="mt-2 grid grid-cols-4 gap-3 px-1">
					{#each classItem.analyticsSummary.buckets as bucket (bucket.label)}
						<div class="text-center">
							<p class="text-[11px] font-semibold leading-4 text-slate-600">
								{bucket.label}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<div class="mt-auto pt-4">
		<div class="flex items-center gap-3">
			<a
				href={classItem.openHref}
				class="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-slate-200 text-sm font-semibold text-slate-800 transition hover:bg-slate-300"
			>
				Abrir turma
			</a>

			<button
				type="button"
				class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200 text-slate-700 transition hover:bg-slate-300"
				aria-label="Mais opções da turma"
			>
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
					<circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
					<circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
				</svg>
			</button>
		</div>
	</div>
</article>
