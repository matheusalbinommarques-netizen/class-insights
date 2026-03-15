<script lang="ts">
	import type {
		TeacherDashboardPerformanceChanges,
		TeacherDashboardRiskTone
	} from '$lib/types/teacher';

	type Props = {
		performanceChanges: TeacherDashboardPerformanceChanges;
	};

	let { performanceChanges }: Props = $props();

	function riskBadgeClass(riskTone: TeacherDashboardRiskTone) {
		if (riskTone === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (riskTone === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-slate-200 bg-white text-slate-700';
	}
</script>

<section class="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
	<div class="flex items-start justify-between gap-4">
		<h2 class="text-2xl font-black tracking-tight text-slate-950">O que mudou no desempenho</h2>
	</div>

	<div class="mt-5 grid gap-4 xl:grid-cols-3">
		<div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
			<h3 class="text-lg font-bold text-slate-950">Materias abaixo da referencia</h3>

			<div class="mt-4 space-y-3">
				{#if performanceChanges.belowReferenceSubjects.length === 0}
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600"
					>
						Nenhuma materia abaixo da referencia no recorte publicado.
					</div>
				{:else}
					{#each performanceChanges.belowReferenceSubjects as item (item.href)}
						<div class="rounded-2xl border border-slate-200 bg-white p-4">
							<p class="text-base font-black text-slate-950">{item.subjectName}</p>
							<div class="mt-3 flex items-end justify-between gap-3">
								<div>
									<p class="text-3xl font-black tracking-tight text-slate-950">
										{item.scoreLabel}
									</p>
									<p class="mt-1 text-sm text-slate-500">{item.helperText}</p>
								</div>
								<a
									href={item.href}
									class="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
								>
									Abrir turma
								</a>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<div class="mt-4">
				<a
					href={performanceChanges.belowReferenceSubjectsHref}
					class="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
				>
					Ver todas
				</a>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
			<h3 class="text-lg font-bold text-slate-950">Alunos em queda</h3>

			<div class="mt-4 space-y-3">
				{#if performanceChanges.fallingStudents.length === 0}
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600"
					>
						Nenhum aluno com queda relevante recente.
					</div>
				{:else}
					{#each performanceChanges.fallingStudents as item (item.href)}
						<div class="rounded-2xl border border-slate-200 bg-white p-4">
							<div class="flex items-start justify-between gap-3">
								<div>
									<p class="text-base font-black text-slate-950">{item.studentName}</p>
									<p class="mt-2 text-sm text-slate-600">
										Media publicada <span class="font-black text-slate-950"
											>{item.publishedAverageLabel}</span
										>
									</p>
									<p class="mt-1 text-sm text-slate-500">{item.helperText}</p>
								</div>
								<span
									class={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${riskBadgeClass(item.riskTone)}`}
								>
									{item.riskLabel}
								</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<div class="mt-4">
				<a
					href={performanceChanges.fallingStudentsHref}
					class="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
				>
					Ver alunos
				</a>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
			<h3 class="text-lg font-bold text-slate-950">Gaps relevantes</h3>

			<div class="mt-4 space-y-3">
				{#if performanceChanges.relevantGaps.length === 0}
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600"
					>
						Nenhum gap relevante na comparacao com a turma.
					</div>
				{:else}
					{#each performanceChanges.relevantGaps as item (item.href)}
						<div class="rounded-2xl border border-slate-200 bg-white p-4">
							<div class="flex items-start justify-between gap-3">
								<div>
									<p class="text-base font-black text-slate-950">{item.studentName}</p>
									<p class="mt-2 text-sm text-slate-600">{item.helperText}</p>
								</div>
								<span
									class={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${riskBadgeClass(item.riskTone)}`}
								>
									{item.riskLabel}
								</span>
							</div>

							{#if item.subjects.length > 0}
								<div class="mt-3 flex flex-wrap gap-2">
									{#each item.subjects as subject (subject)}
										<span
											class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700"
										>
											{subject}
										</span>
									{/each}
								</div>
							{/if}

							<div class="mt-3">
								<a
									href={item.href}
									class="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
								>
									Abrir turma
								</a>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<div class="mt-4">
				<a
					href={performanceChanges.relevantGapsHref}
					class="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
				>
					Abrir turma
				</a>
			</div>
		</div>
	</div>
</section>
