<script lang="ts">
	import TeacherContextMenu from '$lib/components/teacher/TeacherContextMenu.svelte';
	import type {
		TeacherDashboardClassSummaryItem,
		TeacherDashboardRiskTone,
		TeacherDashboardTrendTone
	} from '$lib/types/teacher';

	type ContextMenuItem = {
		id: string;
		label: string;
		href?: string;
		tone?: 'default' | 'danger';
		disabled?: boolean;
	};

	type Props = {
		classItem: TeacherDashboardClassSummaryItem;
		menuItems?: ContextMenuItem[];
		onMenuSelect?: (itemId: string) => void;
	};

	let {
		classItem,
		menuItems = [],
		onMenuSelect = () => {}
	}: Props = $props();

	const axisLevels = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

	function trendClass(trendTone: TeacherDashboardTrendTone) {
		if (trendTone === 'negative') return 'text-red-600';
		if (trendTone === 'positive') return 'text-emerald-600';
		return 'text-slate-500';
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

	function bucketStyle(heightPercent: number, value: number) {
		if (value <= 0) return 'height: 0%';
		const safeHeight = Math.max(14, Math.min(100, Math.round(heightPercent)));
		return `height: ${safeHeight}%`;
	}
</script>

<article class="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
	<div class="flex items-start justify-between gap-4">
		<h3
			class="max-w-[16ch] text-[1.75rem] font-extrabold leading-[1.05] tracking-tight text-slate-950"
		>
			{classItem.className}
		</h3>

		{#if menuItems.length > 0}
			<TeacherContextMenu items={menuItems} onSelect={onMenuSelect} />
		{/if}
	</div>

	<div class="mt-5 grid gap-4 md:grid-cols-3">
		<div>
			<p class="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
				Média publicada
			</p>
			<p class="mt-2 text-[2.2rem] font-extrabold leading-none tracking-tight text-slate-950">
				{classItem.publishedAverageLabel}
			</p>
		</div>

		<div>
			<p class="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
				Cobertura
			</p>
			<p class="mt-2 text-[2.2rem] font-extrabold leading-none tracking-tight text-slate-950">
				{classItem.coverageLabel}
			</p>
		</div>

		<div>
			<p class="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
				Tendência
			</p>
			<p
				class={`mt-2 text-[2.2rem] font-extrabold leading-none tracking-tight ${trendClass(classItem.trendTone)}`}
			>
				{classItem.trendLabel}
			</p>
		</div>
	</div>

	{#if classItem.tags.length > 0}
		<div class="mt-5 flex flex-wrap gap-2">
			{#each classItem.tags as tag, index (`${classItem.classId}-${tag}`)}
				<span class={`rounded-full px-3 py-1.5 text-sm font-bold ${tagClass(index)}`}>
					{tag}
				</span>
			{/each}
		</div>
	{/if}

	<div class="mt-5">
		<p class="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
			Resumo analítico da turma
		</p>

		<div class="mt-4 rounded-3xl border border-slate-200 bg-white px-3 py-4 sm:px-4">
			<div class="grid grid-cols-[22px_1fr] gap-3">
				<div class="flex flex-col justify-between pt-3 pb-10">
					{#each axisLevels as level (level)}
						<span class="text-[0.72rem] font-medium text-slate-400">{level}</span>
					{/each}
				</div>

				<div class="relative min-h-48">
					<div class="absolute inset-0 flex flex-col justify-between pt-2 pb-10">
						{#each axisLevels as level (`grid-${level}`)}
							<div class="border-t border-dashed border-slate-200"></div>
						{/each}
					</div>

					<div class="relative z-10 grid h-full grid-cols-4 items-end gap-3 pt-2 pb-10">
						{#each classItem.analyticsSummary.buckets as bucket (`${classItem.classId}-${bucket.label}`)}
							<div class="flex h-full flex-col items-center justify-end">
								<span class="mb-3 text-sm font-bold text-slate-600">{bucket.value}</span>

								<div
									class={`w-full rounded-t-[1.1rem] ${bucketBarClass(bucket.label)}`}
									style={bucketStyle(bucket.heightPercent, bucket.value)}
								></div>

								<span class="mt-5 text-center text-[0.78rem] font-medium text-slate-500">
									{bucket.label}
								</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mt-4">
		<a
			href={classItem.openHref}
			class="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-200 px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-300"
		>
			Abrir turma
		</a>
	</div>
</article>