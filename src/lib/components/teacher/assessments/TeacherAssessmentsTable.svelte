<script lang="ts">
	import TeacherAssessmentStatusBadge from './TeacherAssessmentStatusBadge.svelte';
	import type { TeacherAssessmentTableRow } from '$lib/types/teacher';

	type Props = {
		rows: TeacherAssessmentTableRow[];
	};

	let { rows }: Props = $props();
</script>

<div class="rounded-3xl border border-slate-200 bg-white shadow-sm">
	{#if rows.length === 0}
		<div class="p-6">
			<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
				<h3 class="text-lg font-black text-slate-950">Nenhuma avaliação encontrada</h3>
				<p class="mt-2 text-sm leading-7 text-slate-600">
					Ajuste os filtros ou crie uma nova avaliação para começar.
				</p>
			</div>
		</div>
	{:else}
		<div class="block lg:hidden">
			<div class="space-y-3 p-4">
				{#each rows as row (row.id)}
					<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<h3 class="text-lg font-black text-slate-950">{row.title}</h3>
								<p class="mt-2 text-sm leading-6 text-slate-600">{row.className}</p>
								<p class="text-sm leading-6 text-slate-600">{row.subjectName}</p>
							</div>

							<TeacherAssessmentStatusBadge label={row.statusLabel} tone={row.statusTone} />
						</div>

						<div class="mt-4 grid grid-cols-3 gap-3">
							<div class="rounded-2xl border border-slate-200 bg-white p-3">
								<p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
									Data
								</p>
								<p class="mt-2 text-sm font-black text-slate-950">{row.assessmentDateLabel}</p>
							</div>

							<div class="rounded-2xl border border-slate-200 bg-white p-3">
								<p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
									Cobertura
								</p>
								<p class="mt-2 text-sm font-black text-slate-950">{row.coverageLabel}</p>
							</div>

							<div class="rounded-2xl border border-slate-200 bg-white p-3">
								<p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
									Média
								</p>
								<p class="mt-2 text-sm font-black text-slate-950">{row.averageLabel}</p>
							</div>
						</div>

						<div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
							<p class="text-sm font-semibold leading-7 text-slate-900">{row.insightLabel}</p>
						</div>

						<div class="mt-4 flex items-center justify-between gap-3">
							{#if row.pendingResultsCount > 0}
								<span class="text-xs font-bold text-slate-500">
									{row.pendingResultsCount} pendência(s)
								</span>
							{:else}
								<span class="text-xs font-bold text-slate-500">Sem pendências abertas</span>
							{/if}

							<a
								href={row.primaryActionHref}
								class="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800"
							>
								{row.primaryActionLabel}
							</a>
						</div>
					</article>
				{/each}
			</div>
		</div>

		<div class="hidden lg:block overflow-x-auto">
			<table class="min-w-full border-collapse">
				<thead>
					<tr class="border-b border-slate-200 bg-slate-50/80">
						<th
							class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
						>
							Avaliação
						</th>
						<th
							class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
						>
							Turma
						</th>
						<th
							class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
						>
							Matéria
						</th>
						<th
							class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
						>
							Status
						</th>
						<th
							class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
						>
							Data
						</th>
						<th
							class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
						>
							Cobertura
						</th>
						<th
							class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
						>
							Média
						</th>
						<th
							class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
						>
							Insight
						</th>
						<th
							class="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-500"
						>
							Ações
						</th>
					</tr>
				</thead>

				<tbody>
					{#each rows as row (row.id)}
						<tr class="border-b border-slate-200 last:border-b-0">
							<td class="px-5 py-4 align-top">
								<p class="text-[1rem] font-black text-slate-950">{row.title}</p>
								{#if row.pendingResultsCount > 0}
									<p class="mt-2 text-xs font-bold text-slate-500">
										{row.pendingResultsCount} pendência(s) aberta(s)
									</p>
								{/if}
							</td>

							<td class="px-5 py-4 align-top text-sm font-semibold text-slate-700">
								{row.className}
							</td>

							<td class="px-5 py-4 align-top text-sm font-semibold text-slate-700">
								{row.subjectName}
							</td>

							<td class="px-5 py-4 align-top">
								<TeacherAssessmentStatusBadge label={row.statusLabel} tone={row.statusTone} />
							</td>

							<td class="px-5 py-4 align-top text-sm font-semibold text-slate-700">
								{row.assessmentDateLabel}
							</td>

							<td class="px-5 py-4 align-top text-sm font-black text-slate-950">
								{row.coverageLabel}
							</td>

							<td class="px-5 py-4 align-top text-sm font-black text-slate-950">
								{row.averageLabel}
							</td>

							<td class="px-5 py-4 align-top text-sm leading-7 text-slate-600">
								{row.insightLabel}
							</td>

							<td class="px-5 py-4 align-top text-right">
								<a
									href={row.primaryActionHref}
									class="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800"
								>
									{row.primaryActionLabel}
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
