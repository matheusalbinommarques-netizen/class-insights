<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';

	import TeacherAssessmentActionCard from '$lib/components/teacher/assessments/TeacherAssessmentActionCard.svelte';
	import TeacherAssessmentsHeader from '$lib/components/teacher/assessments/TeacherAssessmentsHeader.svelte';
	import TeacherAssessmentsSummaryMetrics from '$lib/components/teacher/assessments/TeacherAssessmentsSummaryMetrics.svelte';
	import TeacherAssessmentsTable from '$lib/components/teacher/assessments/TeacherAssessmentsTable.svelte';

	import type {
		TeacherAssessmentTableRow,
		TeacherAssessmentsPageData,
		TeacherSubjectOption
	} from '$lib/types/teacher';

	type AssessmentFeedback = {
		action?: 'createAssessment';
		message?: string;
		success?: boolean;
	};

	type SortOption = 'recent' | 'oldest' | 'coverage' | 'average' | 'priority';
	type StatusFilter = 'all' | 'draft' | 'published' | 'attention' | 'critical' | 'ready';

	type Props = {
		data: TeacherAssessmentsPageData;
	};

	let { data }: Props = $props();

	const formState = $derived(($page.form ?? null) as AssessmentFeedback | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);

	let selectedClassId = $state('');
	let search = $state('');
	let classFilter = $state('all');
	let subjectFilter = $state('all');
	let statusFilter = $state<StatusFilter>('all');
	let sortBy = $state<SortOption>('recent');

	$effect(() => {
		if (!selectedClassId && data.classes[0]) {
			selectedClassId = data.classes[0].id;
		}
	});

	const availableSubjects = $derived.by(() =>
		data.subjects.filter((subject) =>
			selectedClassId ? subject.classIds.includes(selectedClassId) : true
		)
	);

	const filteredSubjects = $derived.by(() => {
		if (classFilter === 'all') return data.subjects;
		return data.subjects.filter((subject) => subject.classIds.includes(classFilter));
	});

	function normalizedIncludes(value: string, query: string) {
		return value.toLocaleLowerCase('pt-BR').includes(query);
	}

	function matchesStatus(row: TeacherAssessmentTableRow, filter: StatusFilter) {
		if (filter === 'all') return true;
		if (filter === 'draft') return row.status === 'draft';
		if (filter === 'published') return row.status === 'published';
		if (filter === 'attention') return row.statusTone === 'attention';
		if (filter === 'critical') return row.statusTone === 'critical';
		if (filter === 'ready') return row.statusTone === 'ready';
		return true;
	}

	const filteredRows = $derived.by(() => {
		const query = search.trim().toLocaleLowerCase('pt-BR');

		const rows = data.rows.filter((row) => {
			const matchesSearch =
				query.length === 0 ||
				normalizedIncludes(row.title, query) ||
				normalizedIncludes(row.className, query) ||
				normalizedIncludes(row.subjectName, query);

			const matchesClass = classFilter === 'all' || row.classId === classFilter;
			const matchesSubject = subjectFilter === 'all' || row.subjectId === subjectFilter;
			const matchesStatusFilter = matchesStatus(row, statusFilter);

			return matchesSearch && matchesClass && matchesSubject && matchesStatusFilter;
		});

		return [...rows].sort((left, right) => {
			if (sortBy === 'oldest') {
				return left.assessmentDate.localeCompare(right.assessmentDate);
			}

			if (sortBy === 'coverage') {
				return left.coveragePercent - right.coveragePercent;
			}

			if (sortBy === 'average') {
				return (left.averagePercent ?? -1) - (right.averagePercent ?? -1);
			}

			if (sortBy === 'priority') {
				return right.priorityRank - left.priorityRank;
			}

			return right.assessmentDate.localeCompare(left.assessmentDate);
		});
	});

	function subjectOptionLabel(subject: TeacherSubjectOption) {
		return subject.code ? `${subject.name} (${subject.code})` : subject.name;
	}
</script>

<svelte:head>
	<title>Class Insights - Avaliações</title>
</svelte:head>

<div class="mx-auto w-full max-w-295 space-y-6">
	<TeacherAssessmentsHeader
		title="Avaliações"
		subtitle="Crie, acompanhe e publique avaliações das suas turmas. Veja o que pede ação agora e opere o fluxo principal do professor sem depender do import legado."
		primaryHref="#new-assessment"
		primaryLabel="Nova avaliação"
		secondaryHref={resolve('/teacher/subjects')}
		secondaryLabel="Gerenciar matérias"
	/>

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

	{#if !data.schema.ready}
		<section class="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Schema pendente</p>
			<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
				A base acadêmica ainda não está ativa neste ambiente
			</h2>
			<p class="mt-3 text-sm leading-7 text-slate-700">{data.schema.message}</p>
		</section>
	{:else}
		<TeacherAssessmentsSummaryMetrics metrics={data.summaryMetrics} />

		<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="mb-5">
				<h2 class="text-2xl font-black tracking-tight text-slate-950">O que pede ação</h2>
				<p class="mt-1 text-sm font-medium text-slate-500">
					As duas avaliações mais prioritárias para revisão agora.
				</p>
			</div>

			{#if data.actionItems.length === 0}
				<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
					<h3 class="text-lg font-black text-slate-950">Nada crítico por enquanto</h3>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Assim que surgirem avaliações ou sinais relevantes, esta área destaca o que merece seu
						primeiro clique.
					</p>
				</div>
			{:else}
				<div class="grid gap-4 xl:grid-cols-2">
					{#each data.actionItems as item (item.id)}
						<TeacherAssessmentActionCard {item} />
					{/each}
				</div>
			{/if}
		</section>

		<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="mb-5">
				<h2 class="text-2xl font-black tracking-tight text-slate-950">Todas as avaliações</h2>
				<p class="mt-1 text-sm font-medium text-slate-500">
					Busque, filtre e compare suas avaliações em um só lugar.
				</p>
			</div>

			<div class="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_220px_220px_220px_220px]">
				<label class="block">
					<span class="sr-only">Buscar avaliação</span>
					<input
						bind:value={search}
						type="text"
						placeholder="Buscar avaliação, turma ou matéria..."
						class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
					/>
				</label>

				<label class="block">
					<span class="sr-only">Filtrar turma</span>
					<select
						bind:value={classFilter}
						class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
					>
						<option value="all">Todas as turmas</option>
						{#each data.classes as classItem (classItem.id)}
							<option value={classItem.id}>{classItem.name}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="sr-only">Filtrar matéria</span>
					<select
						bind:value={subjectFilter}
						class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
					>
						<option value="all">Todas as matérias</option>
						{#each filteredSubjects as subject (subject.id)}
							<option value={subject.id}>{subjectOptionLabel(subject)}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="sr-only">Filtrar status</span>
					<select
						bind:value={statusFilter}
						class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
					>
						<option value="all">Todos os status</option>
						<option value="draft">Rascunho</option>
						<option value="ready">Pronta para publicar</option>
						<option value="published">Publicada</option>
						<option value="attention">Publicada com atenção</option>
						<option value="critical">Publicada com alerta</option>
					</select>
				</label>

				<label class="block">
					<span class="sr-only">Ordenar</span>
					<select
						bind:value={sortBy}
						class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
					>
						<option value="recent">Mais recentes</option>
						<option value="oldest">Mais antigas</option>
						<option value="priority">Maior prioridade</option>
						<option value="coverage">Menor cobertura</option>
						<option value="average">Menor média</option>
					</select>
				</label>
			</div>

			<div class="mt-5">
				<TeacherAssessmentsTable rows={filteredRows} />
			</div>
		</section>

		<section id="new-assessment" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
						Nova avaliação
					</p>
					<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
						Criar novo rascunho
					</h2>
					<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
						Toda avaliação nasce como rascunho. Depois você lança os resultados por aluno, revisa a
						distribuição e publica quando a leitura oficial estiver pronta.
					</p>
				</div>

				<a
					href={resolve('/teacher/subjects')}
					class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
				>
					Organizar matérias
				</a>
			</div>

			{#if data.classes.length === 0}
				<div
					class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
				>
					<h3 class="text-lg font-black text-slate-950">Crie uma turma antes de avaliar</h3>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						A área de avaliações depende de uma turma já criada e de uma matéria vinculada à turma.
					</p>
				</div>
			{:else}
				<form method="POST" action="?/createAssessment" class="mt-5 space-y-4">
					<div class="grid gap-4 md:grid-cols-2">
						<label class="space-y-2 text-sm font-bold text-slate-700">
							<span>Turma</span>
							<select
								name="class_id"
								bind:value={selectedClassId}
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							>
								{#each data.classes as classItem (classItem.id)}
									<option value={classItem.id}>{classItem.name}</option>
								{/each}
							</select>
						</label>

						<label class="space-y-2 text-sm font-bold text-slate-700">
							<span>Matéria</span>
							<select
								name="subject_id"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								disabled={availableSubjects.length === 0}
							>
								{#if availableSubjects.length === 0}
									<option value="">Nenhuma matéria vinculada</option>
								{:else}
									{#each availableSubjects as subject (subject.id)}
										<option value={subject.id}>{subjectOptionLabel(subject)}</option>
									{/each}
								{/if}
							</select>
						</label>
					</div>

					{#if availableSubjects.length === 0}
						<div
							class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800"
						>
							Esta turma ainda não possui matéria vinculada. Primeiro organize isso em
							<a href={resolve('/teacher/subjects')} class="font-bold underline">Matérias</a>
							e depois volte para criar a avaliação.
						</div>
					{/if}

					<div class="grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.6fr]">
						<label class="space-y-2 text-sm font-bold text-slate-700">
							<span>Título</span>
							<input
								name="title"
								placeholder="Ex: Prova 1, Quiz diagnóstico, Trabalho final"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
						</label>

						<label class="space-y-2 text-sm font-bold text-slate-700">
							<span>Data</span>
							<input
								name="assessment_date"
								type="date"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
						</label>

						<label class="space-y-2 text-sm font-bold text-slate-700">
							<span>Peso</span>
							<input
								name="weight"
								type="number"
								min="0.1"
								step="0.1"
								value="1"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
						</label>
					</div>

					<button
						type="submit"
						class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={availableSubjects.length === 0}
					>
						Criar avaliação
					</button>
				</form>
			{/if}
		</section>
	{/if}
</div>
