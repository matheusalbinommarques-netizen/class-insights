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

	function trendClass(trendTone: TeacherDashboardTrendTone) {
		if (trendTone === 'negative') return 'text-red-700';
		if (trendTone === 'positive') return 'text-emerald-700';
		return 'text-slate-600';
	}

	function statusClass(statusTone: TeacherDashboardRiskTone) {
		if (statusTone === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (statusTone === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-slate-200 bg-slate-50 text-slate-500';
	}

	function confirmDelete(event: MouseEvent) {
		if (
			!confirm('Deletar esta turma? Isso remove alunos, materias vinculadas e dados operacionais.')
		) {
			event.preventDefault();
		}
	}
</script>

<article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<h3 class="text-2xl font-black tracking-tight text-slate-950">{classItem.className}</h3>
		</div>

		<span
			class={`inline-flex rounded-full border px-2.5 py-1 ${statusClass(classItem.statusTone)}`}
		>
			<span class="text-xs font-bold uppercase tracking-wider">status</span>
		</span>
	</div>

	<div class="mt-5 grid grid-cols-3 gap-4">
		<div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4">
			<p class="text-xs font-bold uppercase tracking-widest text-slate-500">Media publicada</p>
			<p class="mt-2 text-3xl font-black tracking-tight text-slate-950">
				{classItem.publishedAverageLabel}
			</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4">
			<p class="text-xs font-bold uppercase tracking-widest text-slate-500">Cobertura</p>
			<p class="mt-2 text-3xl font-black tracking-tight text-slate-950">
				{classItem.coverageLabel}
			</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4">
			<p class="text-xs font-bold uppercase tracking-widest text-slate-500">Tendencia</p>
			<p class={`mt-2 text-3xl font-black tracking-tight ${trendClass(classItem.trendTone)}`}>
				{classItem.trendLabel}
			</p>
		</div>
	</div>

	<div class="mt-4 flex flex-wrap gap-2">
		{#if classItem.tags.length > 0}
			{#each classItem.tags as tag (tag)}
				<span
					class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700"
				>
					{tag}
				</span>
			{/each}
		{:else}
			<span
				class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-500"
			>
				Sem materia vinculada
			</span>
		{/if}
	</div>

	<div class="mt-5 flex gap-3">
		<a
			href={classItem.openHref}
			class="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
		>
			Abrir turma
		</a>

		<form method="POST" action="?/deleteClass">
			<input type="hidden" name="classId" value={classItem.classId} />
			<button
				type="submit"
				class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
				onclick={confirmDelete}
			>
				Excluir
			</button>
		</form>
	</div>
</article>
