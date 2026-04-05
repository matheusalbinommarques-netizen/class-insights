<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { tick } from 'svelte';

	import TeacherActionNowCard from '$lib/components/teacher/TeacherActionNowCard.svelte';
	import TeacherClassSummaryCard from '$lib/components/teacher/TeacherClassSummaryCard.svelte';
	import TeacherDashboardHeader from '$lib/components/teacher/TeacherDashboardHeader.svelte';
	import TeacherPerformanceChangesCard from '$lib/components/teacher/TeacherPerformanceChangesCard.svelte';
	import type { TeacherDashboardClassSummaryItem, TeacherDashboardPageData } from '$lib/types/teacher';

	type ActionFeedback = {
		action?: 'createClass' | 'deleteClass' | 'generateClassSnapshot';
		message?: string;
		success?: boolean;
	};

	type MenuItem = {
		id: string;
		label: string;
		href?: string;
		tone?: 'default' | 'danger';
		disabled?: boolean;
	};

	type CriteriaModalKey = 'action-now' | 'performance' | null;

	type Props = {
		data: TeacherDashboardPageData;
	};

	let { data }: Props = $props();

	const formState = $derived(($page.form ?? null) as ActionFeedback | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);

	const classesGridClass = $derived(
		data.classesSummary.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'
	);

	let criteriaModal = $state<CriteriaModalKey>(null);
	let snapshotClassId = $state('');
	let snapshotForm: HTMLFormElement | null = null;

	const actionNowMenuItems: MenuItem[] = [
		{
			id: 'go-classes',
			label: 'Ver tudo em Turmas',
			href: resolve('/teacher/classes')
		},
		{
			id: 'go-assessments',
			label: 'Ver tudo em Avaliações',
			href: resolve('/teacher/assessments')
		},
		{
			id: 'refresh-dashboard',
			label: 'Atualizar visão'
		},
		{
			id: 'open-action-now-criteria',
			label: 'Entender critérios'
		}
	];

	const performanceMenuItems: MenuItem[] = [
		{
			id: 'go-assessments-analysis',
			label: 'Ver análise completa',
			href: resolve('/teacher/assessments')
		},
		{
			id: 'refresh-dashboard',
			label: 'Atualizar visão'
		},
		{
			id: 'open-performance-criteria',
			label: 'Entender critérios'
		}
	];

	function classMenuItems(classItem: TeacherDashboardClassSummaryItem): MenuItem[] {
		return [
			{
				id: `class-new-assessment:${classItem.classId}`,
				label: 'Nova avaliação',
				href: `${resolve('/teacher/assessments')}#new-assessment`
			},
			{
				id: `class-manage-subjects:${classItem.classId}`,
				label: 'Gerenciar matérias',
				href: resolve('/teacher/subjects')
			},
			{
				id: `class-view-students:${classItem.classId}`,
				label: 'Ver alunos',
				href: classItem.openHref
			},
			{
				id: `class-refresh-reading:${classItem.classId}`,
				label: 'Atualizar leitura'
			}
		];
	}

	async function triggerSnapshot(classId: string) {
		snapshotClassId = classId;
		await tick();
		snapshotForm?.requestSubmit();
	}

	async function handleActionNowMenuSelect(itemId: string) {
		if (itemId === 'refresh-dashboard') {
			await invalidateAll();
			return;
		}

		if (itemId === 'open-action-now-criteria') {
			criteriaModal = 'action-now';
		}
	}

	async function handlePerformanceMenuSelect(itemId: string) {
		if (itemId === 'refresh-dashboard') {
			await invalidateAll();
			return;
		}

		if (itemId === 'open-performance-criteria') {
			criteriaModal = 'performance';
		}
	}

	async function handleClassMenuSelect(itemId: string) {
		const [action, classId] = itemId.split(':');

		if (!classId) return;

		if (action === 'class-refresh-reading') {
			await triggerSnapshot(classId);
		}
	}

	function closeCriteriaModal() {
		criteriaModal = null;
	}
</script>

<svelte:head>
	<title>Class Insights - Professor</title>
</svelte:head>

<div class="mx-auto w-full max-w-295">
	<TeacherDashboardHeader teacherName={data.teacherName} syncLabel={data.syncLabel} />

	{#if formMessage}
		<div
			class={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
				formSuccess
					? 'border-emerald-200 bg-emerald-50 text-emerald-700'
					: 'border-red-200 bg-red-50 text-red-700'
			}`}
		>
			{formMessage}
		</div>
	{/if}

	{#if data.error}
		<div
			class="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
		>
			{data.error}
		</div>
	{/if}

	<form
		method="POST"
		action="?/generateClassSnapshot"
		class="hidden"
		bind:this={snapshotForm}
	>
		<input type="hidden" name="classId" value={snapshotClassId} />
	</form>

	<div class="space-y-5">
		<TeacherActionNowCard
			teacherName={data.teacherName}
			actionNow={data.actionNow}
			menuItems={actionNowMenuItems}
			onMenuSelect={handleActionNowMenuSelect}
		/>

		<TeacherPerformanceChangesCard
			performanceChanges={data.performanceChanges}
			menuItems={performanceMenuItems}
			onMenuSelect={handlePerformanceMenuSelect}
		/>

		<section class="space-y-4">
			<div class="flex items-center justify-between gap-3">
				<div>
					<h2 class="text-[2rem] font-black tracking-tight text-slate-950">Suas turmas</h2>
				</div>
			</div>

			{#if data.classesSummary.length === 0}
				<div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
						<h3 class="text-lg font-black text-slate-950">Nenhuma turma encontrada</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Crie uma turma para começar a acompanhar média, cobertura e tendência da leitura pedagógica.
						</p>
					</div>
				</div>
			{:else}
				<div class={`grid gap-4 ${classesGridClass}`}>
					{#each data.classesSummary as classItem (classItem.classId)}
						<TeacherClassSummaryCard
							{classItem}
							menuItems={classMenuItems(classItem)}
							onMenuSelect={handleClassMenuSelect}
						/>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>

{#if criteriaModal}
	<div class="fixed inset-0 z-60 flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-slate-950/45"
			aria-label="Fechar explicação"
			onclick={closeCriteriaModal}
		></button>

		<div class="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
						Entender indicadores
					</p>

					<h3 class="mt-2 text-[1.9rem] font-black tracking-tight text-slate-950">
						{criteriaModal === 'action-now'
							? 'Como a visão de ação imediata funciona'
							: 'Como a visão de desempenho funciona'}
					</h3>
				</div>

				<button
					type="button"
					class="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
					aria-label="Fechar"
					onclick={closeCriteriaModal}
				>
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6l-12 12" />
					</svg>
				</button>
			</div>

			{#if criteriaModal === 'action-now'}
				<div class="mt-5 space-y-4 text-sm leading-7 text-slate-700">
					<p>
						Esta área prioriza o que costuma bloquear o próximo passo do professor:
						<strong class="text-slate-950"> Rascunhos de provas abertos sem fechar</strong>,
						<strong class="text-slate-950"> matérias abaixo da média da instituição</strong>,
						<strong class="text-slate-950"> alunos com notas que caíram de uma prova para outra</strong>
						e
						<strong class="text-slate-950"> turmas sem matéria alguma</strong>.
					</p>

					<p>
						O bloco “Próximo passo” tenta resumir o que mais precisa de atenção agora, e que vale a pena conferir!
					</p>
				</div>
			{:else}
				<div class="mt-5 space-y-4 text-sm leading-7 text-slate-700">
					<p>
						Esta visão separa a leitura em três frentes:
						<strong class="text-slate-950"> Matérias abaixo da média da instituição</strong>,
						<strong class="text-slate-950"> alunos com notas que caíram</strong>
						e
						<strong class="text-slate-950"> alunos com notas abaixo da média da turma</strong>.
					</p>

					<p>
						Os indicadores de risco e os números em destaque, ajudam a entender aonde precisa de intervenção e atenção.
					</p>
				</div>
			{/if}

			<div class="mt-6 flex justify-end">
				<button
					type="button"
					class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
					onclick={closeCriteriaModal}
				>
					Entendi
				</button>
			</div>
		</div>
	</div>
{/if}