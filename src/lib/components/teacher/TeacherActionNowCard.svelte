<script lang="ts">
	import type { TeacherDashboardActionNow, TeacherDashboardPageData } from '$lib/types/teacher';

	type Props = {
		teacherName: TeacherDashboardPageData['teacherName'];
		actionNow: TeacherDashboardActionNow;
	};

	let { teacherName, actionNow }: Props = $props();

	const chipItems = $derived.by(
		() =>
			[
				{
					label: 'turma com rascunho aberto',
					value: actionNow.draftClasses,
					className: 'border-amber-200 bg-amber-50 text-amber-900'
				},
				{
					label: 'materias abaixo da referencia',
					value: actionNow.belowReferenceSubjects,
					className: 'border-red-200 bg-red-50 text-red-700'
				},
				{
					label: 'alunos em queda',
					value: actionNow.fallingStudents,
					className: 'border-slate-200 bg-slate-50 text-slate-700'
				},
				{
					label: 'turmas sem materia',
					value: actionNow.classesWithoutSubject,
					className: 'border-slate-200 bg-slate-50 text-slate-700'
				}
			] as const
	);
</script>

<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
	<div class="flex items-start justify-between gap-4">
		<h2 class="text-2xl font-black tracking-tight text-slate-950">
			O que exige acao agora, {teacherName}
		</h2>
	</div>

	<div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
		{#each chipItems as chip (chip.label)}
			<div
				class={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 ${chip.className}`}
			>
				<span class="text-3xl font-black tracking-tight">{chip.value}</span>
				<span class="text-sm font-semibold leading-5">{chip.label}</span>
			</div>
		{/each}
	</div>

	<div
		class="mt-4 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
	>
		<div>
			<p class="text-sm font-bold text-slate-700">{actionNow.nextStepTitle}</p>
			<p class="mt-1 text-base font-semibold text-slate-900">{actionNow.nextStepText}</p>
		</div>

		<a
			href={actionNow.nextStepHref}
			class="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-base font-bold text-white transition hover:bg-emerald-700"
		>
			Abrir turma
		</a>
	</div>
</section>
