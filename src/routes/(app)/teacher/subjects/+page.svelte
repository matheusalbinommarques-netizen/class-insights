<script lang="ts">
	import { page } from '$app/stores';

	import TeacherSubjectActionCard from '$lib/components/teacher/subjects/TeacherSubjectActionCard.svelte';
	import TeacherSubjectCatalogCard from '$lib/components/teacher/subjects/TeacherSubjectCatalogCard.svelte';
	import TeacherSubjectsHeader from '$lib/components/teacher/subjects/TeacherSubjectsHeader.svelte';
	import TeacherSubjectsSummaryMetrics from '$lib/components/teacher/subjects/TeacherSubjectsSummaryMetrics.svelte';

	import type {
		TeacherSubjectCatalogItem,
		TeacherSubjectOption,
		TeacherSubjectsPageData
	} from '$lib/types/teacher';

	type Feedback = {
		action?: 'createSubject' | 'linkSubjectToClass';
		message?: string;
		success?: boolean;
	};

	type StatusFilter = 'all' | 'healthy' | 'attention' | 'critical' | 'pending';
	type AssessmentFilter = 'all' | 'with-assessments' | 'without-assessments';
	type SortOption = 'priority' | 'name' | 'linked' | 'assessments' | 'coverage' | 'average';
	type DisplayMode = 'cards' | 'list';

	type Props = {
		data: TeacherSubjectsPageData;
	};

	let { data }: Props = $props();

	const formState = $derived(($page.form ?? null) as Feedback | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);

	let selectedClassId = $state('');
	let search = $state('');
	let classFilter = $state('all');
	let statusFilter = $state<StatusFilter>('all');
	let assessmentFilter = $state<AssessmentFilter>('all');
	let sortBy = $state<SortOption>('priority');
	let displayMode = $state<DisplayMode>('cards');

	$effect(() => {
		if (!selectedClassId && data.classes[0]) {
			selectedClassId = data.classes[0].id;
		}
	});

	const availableSubjectOptions = $derived.by(() => {
		if (!selectedClassId) return data.subjectOptions;

		return data.subjectOptions.filter((subject) => !subject.classIds.includes(selectedClassId));
	});

	function subjectOptionLabel(subject: TeacherSubjectOption) {
		return subject.code ? `${subject.name} (${subject.code})` : subject.name;
	}

	function matchesStatus(item: TeacherSubjectCatalogItem, filter: StatusFilter) {
		if (filter === 'all') return true;
		return item.statusTone === filter;
	}

	const filteredCatalog = $derived.by(() => {
		const query = search.trim().toLocaleLowerCase('pt-BR');

		const items = data.catalog.filter((item) => {
			const matchesSearch =
				query.length === 0 ||
				item.name.toLocaleLowerCase('pt-BR').includes(query) ||
				(item.code?.toLocaleLowerCase('pt-BR').includes(query) ?? false) ||
				item.classNames.some((className) => className.toLocaleLowerCase('pt-BR').includes(query));

			const matchesClass = classFilter === 'all' || item.classIds.includes(classFilter);

			const matchesStatusFilter = matchesStatus(item, statusFilter);

			const matchesAssessment =
				assessmentFilter === 'all' ||
				(assessmentFilter === 'with-assessments' && item.assessmentsCount > 0) ||
				(assessmentFilter === 'without-assessments' && item.assessmentsCount === 0);

			return matchesSearch && matchesClass && matchesStatusFilter && matchesAssessment;
		});

		return [...items].sort((left, right) => {
			if (sortBy === 'name') {
				return left.name.localeCompare(right.name, 'pt-BR');
			}

			if (sortBy === 'linked') {
				return right.linkedClassesCount - left.linkedClassesCount;
			}

			if (sortBy === 'assessments') {
				return right.assessmentsCount - left.assessmentsCount;
			}

			if (sortBy === 'coverage') {
				return (left.coveragePercent ?? -1) - (right.coveragePercent ?? -1);
			}

			if (sortBy === 'average') {
				return (left.averagePercent ?? -1) - (right.averagePercent ?? -1);
			}

			return right.priorityRank - left.priorityRank;
		});
	});
</script>

<svelte:head>
	<title>Class Insights - Matérias</title>
</svelte:head>

<div class="mx-auto w-full max-w-295 space-y-6">
	<TeacherSubjectsHeader
		title="Matérias"
		subtitle="Organize as matérias das suas turmas e construa uma base consistente para avaliações. Aqui você enxerga vínculo, uso, cobertura e o próximo passo para cada matéria."
		primaryHref="#new-subject"
		primaryLabel="Nova matéria"
		secondaryHref="#link-subject"
		secondaryLabel="Vincular à turma"
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
		<TeacherSubjectsSummaryMetrics metrics={data.summaryMetrics} />

		<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="mb-5">
				<h2 class="text-2xl font-black tracking-tight text-slate-950">O que pede ação</h2>
				<p class="mt-1 text-sm font-medium text-slate-500">
					As matérias mais prioritárias para revisão agora.
				</p>
			</div>

			{#if data.actionItems.length === 0}
				<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
					<h3 class="text-lg font-black text-slate-950">Nada crítico por enquanto</h3>
					<p class="mt-2 text-sm leading-7 text-slate-600">
						Assim que surgirem lacunas de vínculo, matérias sem avaliação ou cobertura baixa, esta
						área vai mostrar os primeiros cliques.
					</p>
				</div>
			{:else}
				<div class="grid gap-4 xl:grid-cols-3">
					{#each data.actionItems as item (item.id)}
						<TeacherSubjectActionCard {item} />
					{/each}
				</div>
			{/if}
		</section>

		<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_220px_220px_240px_220px_auto]">
				<label class="block">
					<span class="sr-only">Buscar matéria</span>
					<input
						bind:value={search}
						type="text"
						placeholder="Buscar matéria, código ou turma..."
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
					<span class="sr-only">Filtrar situação</span>
					<select
						bind:value={statusFilter}
						class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
					>
						<option value="all">Todas as situações</option>
						<option value="healthy">Saudável</option>
						<option value="attention">Em atenção</option>
						<option value="critical">Cobertura baixa</option>
						<option value="pending">Sem vínculo ou avaliação</option>
					</select>
				</label>

				<label class="block">
					<span class="sr-only">Filtrar por avaliações</span>
					<select
						bind:value={assessmentFilter}
						class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
					>
						<option value="all">Com e sem avaliações</option>
						<option value="with-assessments">Com avaliações</option>
						<option value="without-assessments">Sem avaliações</option>
					</select>
				</label>

				<label class="block">
					<span class="sr-only">Ordenar</span>
					<select
						bind:value={sortBy}
						class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
					>
						<option value="priority">Maior prioridade</option>
						<option value="name">Nome</option>
						<option value="linked">Mais vínculos</option>
						<option value="assessments">Mais avaliações</option>
						<option value="coverage">Menor cobertura</option>
						<option value="average">Menor média</option>
					</select>
				</label>

				<div class="inline-flex h-12 overflow-hidden rounded-2xl border border-slate-200 bg-white">
					<button
						type="button"
						class={`inline-flex items-center justify-center px-4 text-sm font-black transition ${
							displayMode === 'cards'
								? 'bg-slate-900 text-white'
								: 'text-slate-700 hover:bg-slate-50'
						}`}
						onclick={() => (displayMode = 'cards')}
					>
						Cards
					</button>
					<button
						type="button"
						class={`inline-flex items-center justify-center px-4 text-sm font-black transition ${
							displayMode === 'list'
								? 'bg-slate-900 text-white'
								: 'text-slate-700 hover:bg-slate-50'
						}`}
						onclick={() => (displayMode = 'list')}
					>
						Lista
					</button>
				</div>
			</div>
		</section>

		<section class="space-y-4">
			<div class="flex items-center justify-between gap-3">
				<div>
					<h2 class="text-2xl font-black tracking-tight text-slate-950">Todas as matérias</h2>
					<p class="mt-1 text-sm font-medium text-slate-500">
						Veja vínculo, uso, cobertura e maturidade da base em um só catálogo.
					</p>
				</div>
			</div>

			{#if filteredCatalog.length === 0}
				<div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<h3 class="text-lg font-black text-slate-950">Nenhuma matéria encontrada</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Ajuste a busca ou os filtros para encontrar uma matéria específica.
						</p>
					</div>
				</div>
			{:else if displayMode === 'cards'}
				<div class="grid gap-4 xl:grid-cols-3">
					{#each filteredCatalog as item (item.id)}
						<TeacherSubjectCatalogCard {item} />
					{/each}
				</div>
			{:else}
				<div class="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
					<table class="min-w-full border-collapse">
						<thead>
							<tr class="border-b border-slate-200 bg-slate-50/80">
								<th
									class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
								>
									Matéria
								</th>
								<th
									class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
								>
									Vínculos
								</th>
								<th
									class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
								>
									Avaliações
								</th>
								<th
									class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
								>
									Cobertura
								</th>
								<th
									class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
								>
									Média
								</th>
								<th
									class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
								>
									Situação
								</th>
								<th
									class="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500"
								>
									Insight
								</th>
								<th
									class="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-500"
								>
									Ação
								</th>
							</tr>
						</thead>

						<tbody>
							{#each filteredCatalog as item (item.id)}
								<tr class="border-b border-slate-200 last:border-b-0">
									<td class="px-5 py-4 align-top">
										<p class="text-[1rem] font-black text-slate-950">{item.name}</p>
										{#if item.code}
											<p class="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
												{item.code}
											</p>
										{/if}
									</td>

									<td class="px-5 py-4 align-top text-sm font-semibold text-slate-700">
										{item.linkedClassesCount}
									</td>

									<td class="px-5 py-4 align-top text-sm font-semibold text-slate-700">
										{item.assessmentsCount}
									</td>

									<td class="px-5 py-4 align-top text-sm font-black text-slate-950">
										{item.coverageLabel}
									</td>

									<td class="px-5 py-4 align-top text-sm font-black text-slate-950">
										{item.averageLabel}
									</td>

									<td class="px-5 py-4 align-top">
										<span
											class={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
												item.statusTone === 'critical'
													? 'border-red-200 bg-red-50 text-red-700'
													: item.statusTone === 'attention'
														? 'border-amber-200 bg-amber-50 text-amber-700'
														: item.statusTone === 'healthy'
															? 'border-emerald-200 bg-emerald-50 text-emerald-700'
															: 'border-slate-200 bg-slate-100 text-slate-700'
											}`}
										>
											{item.statusLabel}
										</span>
									</td>

									<td class="px-5 py-4 align-top text-sm leading-7 text-slate-600">
										{item.insightLabel}
									</td>

									<td class="px-5 py-4 align-top text-right">
										<a
											href={item.primaryActionHref}
											class="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800"
										>
											{item.primaryActionLabel}
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<div class="grid gap-6 xl:grid-cols-2">
			<section id="new-subject" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Nova matéria</p>
				<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Criar nova base</h2>
				<p class="mt-2 text-sm leading-7 text-slate-600">
					Cadastre a matéria formal para que ela possa ser vinculada a turmas e usada no fluxo de
					avaliações.
				</p>

				<form method="POST" action="?/createSubject" class="mt-5 space-y-4">
					<label class="space-y-2 text-sm font-bold text-slate-700">
						<span>Nome da matéria</span>
						<input
							name="name"
							placeholder="Ex: Gestão de Escopo"
							class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
						/>
					</label>

					<label class="space-y-2 text-sm font-bold text-slate-700">
						<span>Código (opcional)</span>
						<input
							name="code"
							placeholder="Ex: GES-101"
							class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
						/>
					</label>

					<button
						type="submit"
						class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
					>
						Criar matéria
					</button>
				</form>
			</section>

			<section id="link-subject" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
					Vincular à turma
				</p>
				<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
					Transformar cadastro em uso
				</h2>
				<p class="mt-2 text-sm leading-7 text-slate-600">
					A matéria só entra no fluxo oficial quando está vinculada a uma turma do professor.
				</p>

				{#if data.classes.length === 0}
					<div
						class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<h3 class="text-lg font-black text-slate-950">Crie uma turma primeiro</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Sem turma, não há como vincular matérias no fluxo acadêmico.
						</p>
					</div>
				{:else}
					<form method="POST" action="?/linkSubjectToClass" class="mt-5 space-y-4">
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
							<span>Matéria disponível</span>
							<select
								name="subject_id"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
								disabled={availableSubjectOptions.length === 0}
							>
								{#if availableSubjectOptions.length === 0}
									<option value="">Todas as matérias já estão vinculadas</option>
								{:else}
									{#each availableSubjectOptions as subject (subject.id)}
										<option value={subject.id}>{subjectOptionLabel(subject)}</option>
									{/each}
								{/if}
							</select>
						</label>

						{#if availableSubjectOptions.length === 0}
							<div
								class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800"
							>
								Esta turma já recebeu todas as matérias disponíveis no catálogo atual.
							</div>
						{/if}

						<button
							type="submit"
							class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
							disabled={availableSubjectOptions.length === 0}
						>
							Vincular matéria
						</button>
					</form>
				{/if}
			</section>
		</div>
	{/if}
</div>
