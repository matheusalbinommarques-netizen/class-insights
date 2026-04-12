<script lang="ts">
	import NextStepCard from '$lib/components/shared/NextStepCard.svelte';
	import MetricCard from '$lib/components/shared/MetricCard.svelte';
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
		helper: string;
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
			label: 'Rascunhos abertos',
			value: String(actionNow.draftClasses),
			helper: 'Turmas com rascunho de prova aberto.',
			tone: actionNow.draftClasses > 0 ? 'attention' : 'neutral'
		},
		{
			label: 'Abaixo da referência',
			value: String(actionNow.belowReferenceSubjects),
			helper: 'Matérias abaixo da média da instituição.',
			tone: actionNow.belowReferenceSubjects > 0 ? 'critical' : 'neutral'
		},
		{
			label: 'Alunos em queda',
			value: String(actionNow.fallingStudents),
			helper: 'Alunos com notas caindo nas publicações recentes.',
			tone: actionNow.fallingStudents > 0 ? 'attention' : 'neutral'
		},
		{
			label: 'Turmas sem matéria',
			value: String(actionNow.classesWithoutSubject),
			helper: 'Turmas que ainda não entraram no fluxo principal.',
			tone: actionNow.classesWithoutSubject > 0 ? 'attention' : 'neutral'
		}
	]);

	const ctaLabel = $derived(
		actionNow.nextStepHref === '/teacher/classes/new' ? 'Criar turma' : 'Abrir turma'
	);

	function chipToneToSemanticTone(tone: ChipTone) {
		if (tone === 'critical') return 'alert';
		if (tone === 'attention') return 'attention';
		return 'neutral';
	}
</script>

<section class="app-card-strong app-stack-md">
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

	<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
		{#each chips as chip (`${chip.label}-${chip.value}`)}
			<MetricCard
				label={chip.label}
				value={chip.value}
				helper={chip.helper}
				tone={chipToneToSemanticTone(chip.tone)}
				valueTone={chip.tone === 'neutral' ? 'default' : 'tone'}
				compact={true}
			/>
		{/each}
	</div>

	<NextStepCard
		eyebrow={actionNow.nextStepTitle}
		title="Próximo clique recomendado"
		description={actionNow.nextStepText}
		tone="attention"
		primaryHref={actionNow.nextStepHref}
		primaryLabel={ctaLabel}
		primaryTone="healthy"
	/>
</section>
