<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	import TeacherActionNowCard from '$lib/components/teacher/TeacherActionNowCard.svelte';
	import TeacherClassSummaryCard from '$lib/components/teacher/TeacherClassSummaryCard.svelte';
	import TeacherDashboardHeader from '$lib/components/teacher/TeacherDashboardHeader.svelte';
	import TeacherPerformanceChangesCard from '$lib/components/teacher/TeacherPerformanceChangesCard.svelte';
	import StatusPill from '$lib/components/shared/StatusPill.svelte';
	import type { TeacherDashboardPageData } from '$lib/types/teacher';

	type ActionFeedback = {
		action?: 'createClass' | 'deleteClass' | 'generateClassSnapshot';
		message?: string;
		success?: boolean;
	};

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

	const teacherAreaLinks = [
		{
			label: 'Turmas',
			href: resolve('/teacher/classes'),
			description: 'Veja a operação por turma.'
		},
		{
			label: 'Avaliações',
			href: resolve('/teacher/assessments'),
			description: 'Revise rascunhos, cobertura e publicações.'
		},
		{
			label: 'Matérias',
			href: resolve('/teacher/subjects'),
			description: 'Organize o fluxo oficial da V1.'
		}
	];

	const hasClasses = $derived(data.classesSummary.length > 0);

	const classesWithAlert = $derived(
		data.classesSummary.filter(
			(item) => item.statusTone === 'critical' || item.statusTone === 'attention'
		).length
	);

	const setupClasses = $derived(
		data.classesSummary.filter((item) => item.statusTone === 'attention').length
	);

	const hasError = $derived(Boolean(data.error));
</script>

<svelte:head>
	<title>Class Insights - Painel do professor</title>
</svelte:head>

<div class="grid gap-6">
	{#if formMessage}
		<div
			class={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
				formSuccess
					? 'border-emerald-200 bg-emerald-50 text-emerald-700'
					: 'border-red-200 bg-red-50 text-red-700'
			}`}
		>
			{formMessage}
		</div>
	{/if}

	<TeacherDashboardHeader teacherName={data.teacherName} syncLabel={data.syncLabel} />

	{#if hasError}
		<section class="rounded-4xl border border-red-200 bg-red-50 p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.35em] text-red-600">Erro no painel</p>
			<h2 class="mt-3 text-2xl font-black tracking-tight text-red-950">
				Não foi possível carregar sua área do professor
			</h2>
			<p class="mt-3 max-w-2xl text-sm leading-7 text-red-800">{data.error}</p>
			<p class="mt-4 text-sm leading-7 text-red-800">
				Atualize a página. Se o problema continuar, valide sua sessão e tente entrar novamente.
			</p>
		</section>
	{/if}

	<section class="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
		<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div class="min-w-0">
					<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
						Cockpit operacional
					</p>
					<h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
						O que exige ação, onde está acontecendo e qual é o próximo clique
					</h2>
					<p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
						Seu painel foi pensado para reduzir ruído operacional. Primeiro veja a prioridade,
						depois confirme a turma mais sensível e só então aprofunde no fluxo.
					</p>
				</div>

				<div class="flex flex-wrap gap-2">
					<StatusPill label={`${data.classesSummary.length} turma(s)`} tone="context" size="md" />
					<StatusPill
						label={`${classesWithAlert} com alerta`}
						tone={classesWithAlert > 0 ? 'attention' : 'healthy'}
						size="md"
					/>
				</div>
			</div>

			<div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
				<p class="text-sm font-semibold text-slate-700">
					{hasClasses
						? 'Comece pelo próximo clique recomendado e use as turmas abaixo para confirmar onde o fluxo precisa de atenção.'
						: 'Você ainda não tem turmas cadastradas. O primeiro passo é criar sua estrutura operacional.'}
				</p>
			</div>

			<div class="mt-6">
				<TeacherActionNowCard teacherName={data.teacherName} actionNow={data.actionNow} />
			</div>
		</div>

		<div class="grid gap-4">
			<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Acesso rápido</p>
				<h2 class="mt-3 text-xl font-black tracking-tight text-slate-950">
					Onde continuar o trabalho
				</h2>

				<div class="mt-5 grid gap-3">
					{#each teacherAreaLinks as item (item.href)}
						<a
							href={item.href}
							class="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
						>
							<p class="text-sm font-black text-slate-950">{item.label}</p>
							<p class="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
						</a>
					{/each}
				</div>

				<div class="mt-5 flex justify-end">
					<a
						href={resolve('/teacher/classes/new')}
						class="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
					>
						Criar nova turma
					</a>
				</div>
			</div>

			<div class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
					Leitura rápida do painel
				</p>
				<h2 class="mt-3 text-xl font-black tracking-tight text-slate-950">
					Como interpretar esta área
				</h2>

				<div class="mt-5 grid gap-3">
					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
						<p class="text-sm font-bold text-slate-950">Ação agora</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							O primeiro bloco aponta o próximo clique mais útil para continuar o fluxo.
						</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
						<p class="text-sm font-bold text-slate-950">Mudanças recentes</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Use o bloco de desempenho para separar queda recente de estabilidade.
						</p>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
						<p class="text-sm font-bold text-slate-950">Turmas</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							As turmas ajudam a localizar onde o fluxo está andando bem e onde travou.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
		<TeacherPerformanceChangesCard performanceChanges={data.performanceChanges} />
	</section>

	{#if !hasClasses && !hasError}
		<section
			class="rounded-4xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm"
		>
			<p class="text-lg font-black tracking-tight text-slate-950">
				Você ainda não tem turmas cadastradas
			</p>
			<p class="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
				Crie sua primeira turma para começar a organizar matérias, avaliações, lançamentos e
				publicações dentro do fluxo principal do produto.
			</p>

			<div class="mt-6 flex justify-center">
				<a
					href={resolve('/teacher/classes/new')}
					class="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-700"
				>
					Criar primeira turma
				</a>
			</div>
		</section>
	{:else if hasClasses}
		<section class="grid gap-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p class="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
						Visão por turma
					</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Onde o fluxo está andando e onde pede atenção
					</h2>
				</div>

				<a
					href={resolve('/teacher/classes')}
					class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
				>
					Ver todas as turmas
				</a>
			</div>

			<div class={`grid gap-4 ${classesGridClass}`}>
				{#each data.classesSummary as classItem (classItem.classId)}
					<TeacherClassSummaryCard {classItem} />
				{/each}
			</div>

			{#if setupClasses > 0}
				<div
					class="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800"
				>
					<strong class="font-black">Leitura do painel:</strong>
					algumas turmas ainda estão em preparação. Vale revisar se já existe matéria vinculada e se o
					fluxo de avaliação já começou.
				</div>
			{/if}
		</section>
	{/if}
</div>
