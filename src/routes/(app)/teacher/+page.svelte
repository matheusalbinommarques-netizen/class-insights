<script lang="ts">
	import { page } from '$app/stores';
	import TeacherActionNowCard from '$lib/components/teacher/TeacherActionNowCard.svelte';
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

	const formState = $derived(($page.form ?? null) as ActionFeedback | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);

	const classesGridClass = $derived(
		data.classesSummary.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'
	);
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

	<div class="space-y-5">
		<TeacherActionNowCard teacherName={data.teacherName} actionNow={data.actionNow} />

		<TeacherPerformanceChangesCard performanceChanges={data.performanceChanges} />

		<section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="mb-5">
				<h2 class="text-2xl font-extrabold tracking-tight text-slate-950">Suas turmas</h2>
			</div>

			{#if data.classesSummary.length === 0}
				<div class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
					<p class="text-lg font-bold text-slate-950">Nenhuma turma encontrada</p>
					<p class="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
						Crie a primeira turma para começar a publicar avaliações e acompanhar a leitura
						pedagógica.
					</p>
				</div>
			{:else}
				<div class={`grid gap-4 ${classesGridClass}`}>
					{#each data.classesSummary as classItem (classItem.classId)}
						<TeacherClassSummaryCard {classItem} />
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>
