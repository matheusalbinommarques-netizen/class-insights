<script lang="ts">
	type RiskTone = 'critical' | 'attention' | 'neutral';
	type TrendTone = 'positive' | 'negative' | 'neutral';

	type BelowReferenceSubject = {
		subjectName: string;
		scoreLabel: string;
		helperText: string;
		href: string;
	};

	type FallingStudent = {
		studentName: string;
		publishedAverageLabel: string;
		riskLabel: string;
		riskTone: RiskTone;
		helperText: string;
		href: string;
	};

	type RelevantGap = {
		studentName: string;
		gapLabel: string;
		riskLabel: string;
		riskTone: RiskTone;
		helperText: string;
		subjects: string[];
		href: string;
	};

	type PerformanceChanges = {
		belowReferenceSubjects: BelowReferenceSubject[];
		belowReferenceSubjectsHref: string;
		fallingStudents: FallingStudent[];
		fallingStudentsHref: string;
		relevantGaps: RelevantGap[];
		relevantGapsHref: string;
	};

	type Props = {
		performanceChanges: PerformanceChanges;
	};

	let { performanceChanges }: Props = $props();

	function riskBadgeClass(riskTone: RiskTone) {
		if (riskTone === 'critical') {
			return 'bg-red-100 text-red-700 border-red-200';
		}

		if (riskTone === 'attention') {
			return 'bg-amber-100 text-amber-700 border-amber-200';
		}

		return 'bg-slate-100 text-slate-700 border-slate-200';
	}

	function scoreToneClass(scoreLabel: string) {
		const numericPart = Number(scoreLabel.split('/')[0].trim().replace(',', '.'));

		if (Number.isNaN(numericPart)) return 'text-slate-950';
		if (numericPart < 5) return 'text-red-600';
		if (numericPart < 7) return 'text-amber-600';
		return 'text-slate-950';
	}

	function gapToneClass(gapLabel: string) {
		if (gapLabel.startsWith('-')) return 'text-red-600';
		if (gapLabel.startsWith('+')) return 'text-emerald-600';
		return 'text-slate-950';
	}

	function tagClass(index: number) {
		const classes = [
			'bg-slate-100 text-slate-700',
			'bg-sky-100 text-sky-700',
			'bg-emerald-100 text-emerald-700',
			'bg-amber-100 text-amber-700'
		];

		return classes[index % classes.length];
	}
</script>

<section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
	<div class="flex items-start justify-between gap-4">
		<h2 class="text-2xl font-extrabold tracking-tight text-slate-950">O que mudou no desempenho</h2>

		<button
			type="button"
			class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
			aria-label="Mais opções"
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

	<div class="mt-5 grid gap-4 xl:grid-cols-3">
		<div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
			<h3 class="text-lg font-bold text-slate-950">Matérias abaixo da referência</h3>

			<div class="mt-4 divide-y divide-slate-200/80">
				{#if performanceChanges.belowReferenceSubjects.length === 0}
					<div class="py-4">
						<p class="text-sm font-medium text-slate-500">Nenhuma matéria crítica no momento.</p>
					</div>
				{:else}
					{#each performanceChanges.belowReferenceSubjects as item (item.subjectName)}
						<div class="py-4 first:pt-0 last:pb-0">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate text-[1rem] font-bold text-slate-950">{item.subjectName}</p>
									<p class="mt-1 text-sm leading-6 text-slate-600">{item.helperText}</p>
								</div>

								<div
									class={`shrink-0 text-right text-[1.6rem] font-extrabold tracking-tight ${scoreToneClass(item.scoreLabel)}`}
								>
									{item.scoreLabel.split(' / ')[0]}
									<span class="ml-1 text-sm font-semibold text-slate-500">/ 10</span>
								</div>
							</div>

							<div class="mt-3">
								<a
									href={item.href}
									class="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
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
					class="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
				>
					Ver todas
				</a>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
			<h3 class="text-lg font-bold text-slate-950">Alunos em queda</h3>

			<div class="mt-4 divide-y divide-slate-200/80">
				{#if performanceChanges.fallingStudents.length === 0}
					<div class="py-4">
						<p class="text-sm font-medium text-slate-500">Nenhum aluno em queda relevante agora.</p>
					</div>
				{:else}
					{#each performanceChanges.fallingStudents as item (item.studentName)}
						<div class="py-4 first:pt-0 last:pb-0">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate text-[1rem] font-bold text-slate-950">{item.studentName}</p>
									<p class="mt-1 text-sm leading-6 text-slate-600">{item.helperText}</p>
								</div>

								<span
									class={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-bold ${riskBadgeClass(item.riskTone)}`}
								>
									{item.riskLabel}
								</span>
							</div>

							<div class="mt-3 flex items-center justify-between gap-3">
								<p class="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
									Média publicada
								</p>
								<p class="text-lg font-extrabold tracking-tight text-slate-950">
									{item.publishedAverageLabel}
								</p>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<div class="mt-4">
				<a
					href={performanceChanges.fallingStudentsHref}
					class="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
				>
					Ver alunos
				</a>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
			<h3 class="text-lg font-bold text-slate-950">Gaps relevantes</h3>

			<div class="mt-4 divide-y divide-slate-200/80">
				{#if performanceChanges.relevantGaps.length === 0}
					<div class="py-4">
						<p class="text-sm font-medium text-slate-500">Nenhum gap relevante identificado.</p>
					</div>
				{:else}
					{#each performanceChanges.relevantGaps as item (item.studentName)}
						<div class="py-4 first:pt-0 last:pb-0">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate text-[1rem] font-bold text-slate-950">{item.studentName}</p>
									<p class="mt-1 text-sm leading-6 text-slate-600">{item.helperText}</p>
								</div>

								<div class="shrink-0 text-right">
									<p
										class={`text-[1.35rem] font-extrabold tracking-tight ${gapToneClass(item.gapLabel)}`}
									>
										{item.gapLabel}
									</p>
									<span
										class={`mt-1 inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${riskBadgeClass(item.riskTone)}`}
									>
										{item.riskLabel}
									</span>
								</div>
							</div>

							{#if item.subjects.length > 0}
								<div class="mt-3 flex flex-wrap gap-2">
									{#each item.subjects as subject, index (subject)}
										<span
											class={`inline-flex h-8 items-center justify-center rounded-xl px-3 text-xs font-semibold ${tagClass(index)}`}
										>
											{subject}
										</span>
									{/each}
								</div>
							{/if}

							<div class="mt-3">
								<a
									href={item.href}
									class="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
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
					class="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
				>
					Ver gaps
				</a>
			</div>
		</div>
	</div>
</section>
