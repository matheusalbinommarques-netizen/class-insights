<script lang="ts">
	type ActionNow = {
		draftClasses: number;
		belowReferenceSubjects: number;
		fallingStudents: number;
		classesWithoutSubject: number;
		nextStepTitle: string;
		nextStepText: string;
		nextStepHref: string;
	};

	type Props = {
		teacherName: string;
		actionNow: ActionNow;
	};

	let { teacherName, actionNow }: Props = $props();

	type SummaryChip = {
		value: number;
		label: string;
		tone: 'amber' | 'red' | 'slate';
	};

	const chips = $derived<SummaryChip[]>([
		{
			value: actionNow.draftClasses,
			label: 'turma com rascunho aberto',
			tone: actionNow.draftClasses > 0 ? 'amber' : 'slate'
		},
		{
			value: actionNow.belowReferenceSubjects,
			label: 'matérias abaixo da referência',
			tone: actionNow.belowReferenceSubjects > 0 ? 'red' : 'slate'
		},
		{
			value: actionNow.fallingStudents,
			label: 'alunos em queda',
			tone: actionNow.fallingStudents > 0 ? 'slate' : 'slate'
		},
		{
			value: actionNow.classesWithoutSubject,
			label: 'turmas sem matéria',
			tone: actionNow.classesWithoutSubject > 0 ? 'slate' : 'slate'
		}
	]);

	function chipClass(tone: SummaryChip['tone']) {
		if (tone === 'amber') return 'border-amber-200 bg-amber-50';
		if (tone === 'red') return 'border-red-200 bg-red-50';
		return 'border-slate-200 bg-slate-50';
	}

	function chipValueClass(tone: SummaryChip['tone']) {
		if (tone === 'amber') return 'text-amber-700';
		if (tone === 'red') return 'text-red-700';
		return 'text-slate-950';
	}
</script>

<section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
	<div class="flex items-start justify-between gap-4">
		<h2
			class="max-w-3xl text-[1.85rem] font-extrabold leading-[1.05] tracking-tight text-slate-950 lg:text-[2rem]"
		>
			O que exige ação agora, {teacherName}
		</h2>

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

	<div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
		{#each chips as chip (`${chip.label}-${chip.value}`)}
			<div class={`rounded-2xl border px-4 py-3.5 ${chipClass(chip.tone)}`}>
				<div class="flex items-center gap-3">
					<p
						class={`text-[1.7rem] font-extrabold leading-none tracking-tight ${chipValueClass(chip.tone)}`}
					>
						{chip.value}
					</p>

					<p class="text-[0.95rem] font-semibold leading-5 text-slate-700">
						{chip.label}
					</p>
				</div>
			</div>
		{/each}
	</div>

	<div
		class="mt-4 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
	>
		<div class="min-w-0">
			<p class="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-amber-700">
				{actionNow.nextStepTitle}
			</p>

			<p class="mt-2 text-[1rem] font-semibold leading-7 text-slate-900">
				{actionNow.nextStepText}
			</p>
		</div>

		<a
			href={actionNow.nextStepHref}
			class="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
		>
			Abrir turma
		</a>
	</div>
</section>
