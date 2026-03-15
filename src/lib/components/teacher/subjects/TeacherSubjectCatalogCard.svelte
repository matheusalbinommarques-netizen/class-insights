<script lang="ts">
	import TeacherSubjectStatusBadge from './TeacherSubjectStatusBadge.svelte';
	import type { TeacherSubjectCatalogItem } from '$lib/types/teacher';

	type Props = {
		item: TeacherSubjectCatalogItem;
	};

	let { item }: Props = $props();
</script>

<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
	<div class="flex items-start justify-between gap-3">
		<TeacherSubjectStatusBadge label={item.statusLabel} tone={item.statusTone} />

		<button
			type="button"
			class="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
			aria-label="Mais opções"
		>
			<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
				<circle cx="5" cy="12" r="1.8" />
				<circle cx="12" cy="12" r="1.8" />
				<circle cx="19" cy="12" r="1.8" />
			</svg>
		</button>
	</div>

	<div class="mt-4 min-w-0">
		<h3 class="text-[1.8rem] font-black leading-tight tracking-tight text-slate-950">
			{item.name}
		</h3>

		{#if item.code}
			<p class="mt-2 text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
				{item.code}
			</p>
		{/if}
	</div>

	{#if item.classNames.length > 0}
		<div class="mt-4 flex flex-wrap gap-2">
			{#each item.classNames.slice(0, 3) as className (`${item.id}-${className}`)}
				<span
					class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
				>
					{className}
				</span>
			{/each}

			{#if item.classNames.length > 3}
				<span
					class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
				>
					+{item.classNames.length - 3} turmas
				</span>
			{/if}
		</div>
	{/if}

	<div class="mt-5 grid grid-cols-3 gap-3">
		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
			<p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Vínculos</p>
			<p class="mt-2 text-lg font-black text-slate-950">{item.linkedClassesCount}</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
			<p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Avaliações</p>
			<p class="mt-2 text-lg font-black text-slate-950">{item.assessmentsCount}</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
			<p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Cobertura</p>
			<p class="mt-2 text-lg font-black text-slate-950">{item.coverageLabel}</p>
		</div>
	</div>

	<div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
		<p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Insight</p>
		<p class="mt-2 text-sm leading-7 text-slate-800">
			{item.insightLabel}
		</p>
	</div>

	<div class="mt-4 flex flex-wrap gap-3">
		<a
			href={item.primaryActionHref}
			class="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
		>
			{item.primaryActionLabel}
		</a>

		{#if item.secondaryActionHref && item.secondaryActionLabel}
			<a
				href={item.secondaryActionHref}
				class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
			>
				{item.secondaryActionLabel}
			</a>
		{/if}
	</div>
</article>
