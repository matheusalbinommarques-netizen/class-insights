<script lang="ts">
	import TeacherContextMenu from '$lib/components/teacher/TeacherContextMenu.svelte';
	import type { TeacherDashboardActionNow } from '$lib/types/teacher';

	type ContextMenuItem = {
		id: string;
		label: string;
		href?: string;
		tone?: 'default' | 'danger';
		disabled?: boolean;
	};

	type ChipTone = 'attention' | 'critical' | 'neutral';

	type ActionNowChip = {
		label: string;
		value: string;
		tone: ChipTone;
	};

	type Props = {
		teacherName: string;
		actionNow: TeacherDashboardActionNow;
		menuItems?: ContextMenuItem[];
		onMenuSelect?: (itemId: string) => void;
	};

	let {
		teacherName: _teacherName,
		actionNow,
		menuItems = [],
		onMenuSelect = () => {}
	}: Props = $props();

	const chips = $derived.by((): ActionNowChip[] => [
		{
			label: 'Turma com rascunho de prova aberto',
			value: String(actionNow.draftClasses),
			tone: actionNow.draftClasses > 0 ? 'attention' : 'neutral'
		},
		{
			label: 'Matérias abaixo média da instituição',
			value: String(actionNow.belowReferenceSubjects),
			tone: actionNow.belowReferenceSubjects > 0 ? 'critical' : 'neutral'
		},
		{
			label: 'Alunos com notas caindo',
			value: String(actionNow.fallingStudents),
			tone: actionNow.fallingStudents > 0 ? 'attention' : 'neutral'
		},
		{
			label: 'Turmas sem matéria',
			value: String(actionNow.classesWithoutSubject),
			tone: actionNow.classesWithoutSubject > 0 ? 'attention' : 'neutral'
		}
	]);

	const ctaLabel = $derived(
		actionNow.nextStepHref === '/teacher/classes/new' ? 'Criar turma' : 'Abrir turma'
	);

	function chipClass(tone: ChipTone) {
		if (tone === 'critical') {
			return 'border-red-200 bg-red-50';
		}

		if (tone === 'attention') {
			return 'border-slate-200 bg-white';
		}

		return 'border-slate-200 bg-slate-50';
	}

	function chipValueClass(tone: ChipTone) {
		if (tone === 'critical') return 'text-red-600';
		return 'text-slate-950';
	}
</script>

<section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<h2 class="text-[2rem] font-black leading-tight tracking-tight text-slate-950">
				O que exige ação agora
			</h2>
		</div>

		{#if menuItems.length > 0}
			<TeacherContextMenu items={menuItems} onSelect={onMenuSelect} />
		{/if}
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
			{ctaLabel}
		</a>
	</div>
</section>
