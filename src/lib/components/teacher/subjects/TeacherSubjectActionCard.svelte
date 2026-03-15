<script lang="ts">
	import TeacherSubjectStatusBadge from './TeacherSubjectStatusBadge.svelte';
	import type { TeacherSubjectActionItem } from '$lib/types/teacher';

	type Props = {
		item: TeacherSubjectActionItem;
	};

	let { item }: Props = $props();
</script>

<article class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<h3 class="text-[1.55rem] font-black leading-tight tracking-tight text-slate-950">
				{item.name}
			</h3>

			{#if item.code}
				<p class="mt-2 text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
					{item.code}
				</p>
			{/if}

			<div class="mt-3 flex flex-wrap items-center gap-2">
				<TeacherSubjectStatusBadge label={item.statusLabel} tone={item.statusTone} />
			</div>
		</div>

		<a
			href={item.primaryActionHref}
			class="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
		>
			{item.primaryActionLabel}
		</a>
	</div>

	{#if item.classNames.length > 0}
		<div class="mt-4 flex flex-wrap gap-2">
			{#each item.classNames as className (`${item.id}-${className}`)}
				<span
					class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
				>
					{className}
				</span>
			{/each}
		</div>
	{/if}

	<div class="mt-4 grid gap-3 sm:grid-cols-3">
		<div class="rounded-2xl border border-slate-200 bg-white p-4">
			<p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Vínculos</p>
			<p class="mt-2 text-[1.2rem] font-black tracking-tight text-slate-950">
				{item.linkedClassesLabel}
			</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-4">
			<p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Avaliações</p>
			<p class="mt-2 text-[1.2rem] font-black tracking-tight text-slate-950">
				{item.assessmentsLabel}
			</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-4">
			<p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Cobertura</p>
			<p class="mt-2 text-[1.2rem] font-black tracking-tight text-slate-950">
				{item.coverageLabel}
			</p>
		</div>
	</div>

	<div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
		<p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Próximo passo</p>
		<p class="mt-2 text-sm font-semibold leading-7 text-slate-900">
			{item.nextStepText}
		</p>
	</div>

	{#if item.secondaryActionHref && item.secondaryActionLabel}
		<div class="mt-4">
			<a
				href={item.secondaryActionHref}
				class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
			>
				{item.secondaryActionLabel}
			</a>
		</div>
	{/if}
</article>
