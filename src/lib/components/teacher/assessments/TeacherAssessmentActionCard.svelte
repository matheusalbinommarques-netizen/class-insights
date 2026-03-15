<script lang="ts">
	import TeacherAssessmentStatusBadge from './TeacherAssessmentStatusBadge.svelte';
	import type { TeacherAssessmentActionItem } from '$lib/types/teacher';

	type Props = {
		item: TeacherAssessmentActionItem;
	};

	let { item }: Props = $props();
</script>

<article class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<h3 class="text-[1.55rem] font-black leading-tight tracking-tight text-slate-950">
				{item.title}
			</h3>
			<p class="mt-2 text-sm leading-7 text-slate-600">
				Turma: {item.className}
			</p>
			<p class="text-sm leading-7 text-slate-600">
				Matéria: {item.subjectName}
			</p>
		</div>

		<a
			href={item.actionHref}
			class="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
		>
			{item.actionLabel}
		</a>
	</div>

	<div class="mt-4 flex flex-wrap items-center gap-2">
		<TeacherAssessmentStatusBadge label={item.statusLabel} tone={item.statusTone} />
	</div>

	<div class="mt-4 grid gap-3 sm:grid-cols-3">
		<div class="rounded-2xl border border-slate-200 bg-white p-4">
			<p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Cobertura</p>
			<p class="mt-2 text-[1.4rem] font-black tracking-tight text-slate-950">
				{item.coverageLabel}
			</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-4">
			<p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Média</p>
			<p class="mt-2 text-[1.4rem] font-black tracking-tight text-slate-950">{item.averageLabel}</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-4">
			<p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Data</p>
			<p class="mt-2 text-[1.1rem] font-black tracking-tight text-slate-950">{item.dateLabel}</p>
		</div>
	</div>

	<div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
		<p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Próximo passo</p>
		<p class="mt-2 text-sm font-semibold leading-7 text-slate-900">
			{item.nextStepText}
		</p>
	</div>
</article>
