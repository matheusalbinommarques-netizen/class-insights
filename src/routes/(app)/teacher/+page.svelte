<script lang="ts">
	import { page } from '$app/stores';
	import TeacherActionNowCard from '$lib/components/teacher/TeacherActionNowCard.svelte';
	import TeacherAnalyticsCard from '$lib/components/teacher/TeacherAnalyticsCard.svelte';
	import TeacherClassSummaryCard from '$lib/components/teacher/TeacherClassSummaryCard.svelte';
	import TeacherDashboardHeader from '$lib/components/teacher/TeacherDashboardHeader.svelte';
	import TeacherPerformanceChangesCard from '$lib/components/teacher/TeacherPerformanceChangesCard.svelte';
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

	let newMin = $state(0);
	let newMax = $state(10);
	let newDecimals = $state(0);
	let showCreateForm = $state(false);
	let createFormPrimed = false;

	const formState = $derived(($page.form ?? null) as ActionFeedback | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);

	$effect(() => {
		if (!createFormPrimed) {
			showCreateForm = data.classesSummary.length === 0;
			createFormPrimed = true;
		}
	});
</script>

<svelte:head>
	<title>Class Insights - Professor</title>
</svelte:head>

<div class="teacher-dashboard-page">
	<TeacherDashboardHeader teacherName={data.teacherName} syncLabel={data.syncLabel} />

	{#if formMessage}
		<div
			class={`mb-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${
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
			class="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
		>
			{data.error}
		</div>
	{/if}

	<div class="teacher-dashboard-grid grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
		<div class="teacher-dashboard-main-column space-y-0">
			<TeacherActionNowCard teacherName={data.teacherName} actionNow={data.actionNow} />

			<TeacherPerformanceChangesCard performanceChanges={data.performanceChanges} />

			<section id="teacher-classes-section" class="mt-6">
				<div class="mb-4 flex items-center justify-between gap-4">
					<h2 class="text-2xl font-black tracking-tight text-slate-950">Suas turmas</h2>

					<button
						type="button"
						class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
						onclick={() => (showCreateForm = !showCreateForm)}
					>
						{showCreateForm ? 'Fechar' : 'Nova turma'}
					</button>
				</div>

				{#if showCreateForm}
					<section
						id="teacher-create-class"
						class="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
					>
						<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div class="max-w-2xl">
								<p class="text-xs font-black uppercase tracking-widest text-slate-500">
									Nova turma
								</p>
								<h3 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
									Criar turma sem sair do dashboard
								</h3>
								<p class="mt-2 text-sm leading-7 text-slate-600">
									Esta acao preserva o fluxo atual. A nova turma entra direto no shell do professor
									e pode seguir para materias e avaliacoes depois.
								</p>
							</div>
						</div>

						<form method="POST" action="?/createClass" class="mt-5 space-y-4">
							<div class="space-y-2">
								<label for="class-name" class="block text-sm font-bold text-slate-700">
									Nome da turma
								</label>
								<input
									id="class-name"
									name="name"
									placeholder="Ex: 2o Ano A"
									class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								/>
							</div>

							<div class="grid gap-3 sm:grid-cols-3">
								<div class="space-y-2">
									<label for="score-min" class="block text-sm font-bold text-slate-700">Min</label>
									<input
										id="score-min"
										name="score_min"
										type="number"
										step="any"
										bind:value={newMin}
										class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									/>
								</div>

								<div class="space-y-2">
									<label for="score-max" class="block text-sm font-bold text-slate-700">Max</label>
									<input
										id="score-max"
										name="score_max"
										type="number"
										step="any"
										bind:value={newMax}
										class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									/>
								</div>

								<div class="space-y-2">
									<label for="score-decimals" class="block text-sm font-bold text-slate-700">
										Decimais
									</label>
									<input
										id="score-decimals"
										name="score_decimals"
										type="number"
										min="0"
										max="6"
										bind:value={newDecimals}
										class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
									/>
								</div>
							</div>

							<div
								class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
							>
								Escala padrao:
								<strong class="text-slate-950"> {newMin}-{newMax} </strong>
								com
								<strong class="text-slate-950"> {newDecimals} </strong>
								decimal(is).
							</div>

							<button
								type="submit"
								class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
							>
								Criar turma
							</button>
						</form>
					</section>
				{/if}

				{#if data.classesSummary.length === 0}
					<div
						class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm"
					>
						<h3 class="text-2xl font-black tracking-tight text-slate-950">Nenhuma turma ainda</h3>
						<p class="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
							Assim que a primeira turma for criada, ela aparece aqui com media publicada,
							cobertura, tendencia e tags de materias.
						</p>
						<button
							type="button"
							class="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
							onclick={() => (showCreateForm = true)}
						>
							Criar primeira turma
						</button>
					</div>
				{:else}
					<div class="grid gap-4 xl:grid-cols-2">
						{#each data.classesSummary as classItem (classItem.classId)}
							<TeacherClassSummaryCard {classItem} />
						{/each}
					</div>
				{/if}
			</section>
		</div>

		<aside class="teacher-dashboard-side-column">
			<TeacherAnalyticsCard analyticsSummary={data.analyticsSummary} />
		</aside>
	</div>
</div>
