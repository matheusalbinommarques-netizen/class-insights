<script lang="ts">
	import TeacherContextMenu from '$lib/components/teacher/TeacherContextMenu.svelte';
	import type { TeacherDashboardPerformanceChanges, TeacherDashboardRiskTone } from '$lib/types/teacher';

	type ContextMenuItem = {
		id: string;
		label: string;
		href?: string;
		tone?: 'default' | 'danger';
		disabled?: boolean;
	};

	type Props = {
		performanceChanges: TeacherDashboardPerformanceChanges;
		menuItems?: ContextMenuItem[];
		onMenuSelect?: (itemId: string) => void;
	};

	let {
		performanceChanges,
		menuItems = [],
		onMenuSelect = () => {}
	}: Props = $props();

	function riskBadgeClass(riskTone: TeacherDashboardRiskTone) {
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

	function subjectChipClass(index: number) {
		const classes = [
			'bg-sky-100 text-sky-700',
			'bg-blue-100 text-blue-700',
			'bg-emerald-100 text-emerald-700',
			'bg-slate-100 text-slate-700'
		];

		return classes[index % classes.length];
	}
</script>

<section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<h2 class="text-[2rem] font-black leading-tight tracking-tight text-slate-950">
				O que mudou no desempenho
			</h2>
		</div>

		{#if menuItems.length > 0}
			<TeacherContextMenu items={menuItems} onSelect={onMenuSelect} />
		{/if}
	</div>

	<div class="mt-5 grid gap-4 xl:grid-cols-3">
		<section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
			<div class="flex items-center justify-between gap-3">
				<h3 class="text-[1.45rem] font-black tracking-tight text-slate-950">
					Matérias abaixo da média da instituição
				</h3>
			</div>

			{#if performanceChanges.belowReferenceSubjects.length === 0}
				<div class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
					Nenhuma matéria abaixo da média da instituição agora.
				</div>
			{:else}
				<div class="mt-4 space-y-4">
					{#each performanceChanges.belowReferenceSubjects as subject, index (subject.subjectName + index)}
						<div class={index > 0 ? 'border-t border-slate-200 pt-4' : ''}>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<h4 class="text-[1.12rem] font-black text-slate-950">{subject.subjectName}</h4>
									<p class="mt-1 text-sm leading-7 text-slate-600">{subject.helperText}</p>
								</div>

								<p class={`text-[1.9rem] font-black tracking-tight ${scoreToneClass(subject.scoreLabel)}`}>
									{subject.scoreLabel}
								</p>
							</div>

							<a
								href={subject.href}
								class="mt-3 inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
							>
								Abrir turma
							</a>
						</div>
					{/each}
				</div>
			{/if}

			<a
				href={performanceChanges.belowReferenceSubjectsHref}
				class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
			>
				Ver todas
			</a>
		</section>

		<section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
			<div class="flex items-center justify-between gap-3">
				<h3 class="text-[1.45rem] font-black tracking-tight text-slate-950">
					Alunos com notas caindo
				</h3>
			</div>

			{#if performanceChanges.fallingStudents.length === 0}
				<div class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
					Não há alunos em queda relevante agora.
				</div>
			{:else}
				<div class="mt-4 space-y-4">
					{#each performanceChanges.fallingStudents as student, index (student.studentName + index)}
						<div class={index > 0 ? 'border-t border-slate-200 pt-4' : ''}>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<h4 class="text-[1.12rem] font-black text-slate-950">{student.studentName}</h4>
									<p class="mt-1 text-sm leading-7 text-slate-600">{student.helperText}</p>
								</div>

								<span
									class={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${riskBadgeClass(student.riskTone)}`}
								>
									{student.riskLabel}
								</span>
							</div>

							<div class="mt-3 flex items-end justify-between gap-3">
								<div>
									<p class="text-[0.72rem] font-black uppercase tracking-[0.18em] text-slate-500">
										Média publicada
									</p>
									<p class="mt-2 text-[1.7rem] font-black tracking-tight text-slate-950">
										{student.publishedAverageLabel}
									</p>
								</div>

								<a
									href={student.href}
									class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
								>
									Ver aluno
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<a
				href={performanceChanges.fallingStudentsHref}
				class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
			>
				Ver alunos
			</a>
		</section>

		<section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
			<div class="flex items-center justify-between gap-3">
				<h3 class="text-[1.45rem] font-black tracking-tight text-slate-950">
					Alunos abaixo da média da turma
				</h3>
			</div>

			{#if performanceChanges.relevantGaps.length === 0}
				<div class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
					Nenhuma nota relevante abaixo da média da turma identificada agora.
				</div>
			{:else}
				<div class="mt-4 space-y-4">
					{#each performanceChanges.relevantGaps as gap, index (gap.studentName + index)}
						<div class={index > 0 ? 'border-t border-slate-200 pt-4' : ''}>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<h4 class="text-[1.12rem] font-black text-slate-950">{gap.studentName}</h4>
									<p class="mt-1 text-sm leading-7 text-slate-600">{gap.helperText}</p>
								</div>

								<div class="text-right">
									<p class={`text-[1.7rem] font-black tracking-tight ${gapToneClass(gap.gapLabel)}`}>
										{gap.gapLabel}
									</p>
									<span
										class={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black ${riskBadgeClass(gap.riskTone)}`}
									>
										{gap.riskLabel}
									</span>
								</div>
							</div>

							{#if gap.subjects.length > 0}
								<div class="mt-3 flex flex-wrap gap-2">
									{#each gap.subjects as subjectName, subjectIndex (`${gap.studentName}-${subjectName}`)}
										<span
											class={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${subjectChipClass(subjectIndex)}`}
										>
											{subjectName}
										</span>
									{/each}
								</div>
							{/if}

							<a
								href={gap.href}
								class="mt-3 inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
							>
								Abrir turma
							</a>
						</div>
					{/each}
				</div>
			{/if}

			<a
				href={performanceChanges.relevantGapsHref}
				class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
			>
				Ver turma
			</a>
		</section>
	</div>
</section>