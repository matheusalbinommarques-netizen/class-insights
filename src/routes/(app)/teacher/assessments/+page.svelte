<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';

	import MetricCard from '$lib/components/shared/MetricCard.svelte';
	import NextStepCard from '$lib/components/shared/NextStepCard.svelte';
	import StatusPill from '$lib/components/shared/StatusPill.svelte';

	import type {
		TeacherAssessmentActionItem,
		TeacherAssessmentTableRow,
		TeacherAssessmentsMetricTone,
		TeacherAssessmentsPageData
	} from '$lib/types/teacher';

	type AssessmentFeedback = {
		action?: 'createAssessment';
		message?: string;
		success?: boolean;
	};

	type SortOption = 'recent' | 'oldest' | 'coverage' | 'average' | 'priority';
	type StatusFilter = 'all' | 'draft' | 'published' | 'attention' | 'critical' | 'ready';
	type PipelineStage = 'drafts' | 'ready' | 'attention' | 'stable';

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
	let sortBy = $state<SortOption>('priority');

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

	function sortRows(rows: TeacherAssessmentTableRow[]) {
		return [...rows].sort((left, right) => {
			if (sortBy === 'oldest') {
				return left.assessmentDate.localeCompare(right.assessmentDate);
			}

			if (sortBy === 'coverage') {
				return right.coveragePercent - left.coveragePercent;
			}

			if (sortBy === 'average') {
				return (right.averagePercent ?? -1) - (left.averagePercent ?? -1);
			}

			if (sortBy === 'priority') {
				return left.priorityRank - right.priorityRank;
			}

			return right.assessmentDate.localeCompare(left.assessmentDate);
		});
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

		return sortRows(rows);
	});

	function getStage(row: TeacherAssessmentTableRow): PipelineStage {
		if (row.status === 'draft' && row.statusTone === 'ready') return 'ready';
		if (row.status === 'draft') return 'drafts';
		if (row.statusTone === 'attention' || row.statusTone === 'critical') return 'attention';
		return 'stable';
	}

	const pipeline = $derived.by(() => {
		const initial: Record<PipelineStage, TeacherAssessmentTableRow[]> = {
			drafts: [],
			ready: [],
			attention: [],
			stable: []
		};

		for (const row of filteredRows) {
			initial[getStage(row)].push(row);
		}

		return initial;
	});

	const reviewFirstItems = $derived.by(() => {
		if (data.actionItems.length > 0) {
			return data.actionItems.slice(0, 3);
		}

		return filteredRows.slice(0, 3).map(
			(row): TeacherAssessmentActionItem => ({
				id: row.id,
				title: row.title,
				className: row.className,
				subjectName: row.subjectName,
				statusLabel: row.statusLabel,
				statusTone: row.statusTone,
				coverageLabel: row.coverageLabel,
				averageLabel: row.averageLabel,
				dateLabel: row.assessmentDateLabel,
				nextStepText: row.insightLabel,
				actionHref: row.primaryActionHref,
				actionLabel: row.primaryActionLabel
			})
		);
	});

	const dominantNextStep = $derived(
		reviewFirstItems[0] ??
			(data.rows[0]
				? {
						id: data.rows[0].id,
						title: data.rows[0].title,
						className: data.rows[0].className,
						subjectName: data.rows[0].subjectName,
						statusLabel: data.rows[0].statusLabel,
						statusTone: data.rows[0].statusTone,
						coverageLabel: data.rows[0].coverageLabel,
						averageLabel: data.rows[0].averageLabel,
						dateLabel: data.rows[0].assessmentDateLabel,
						nextStepText: data.rows[0].insightLabel,
						actionHref: data.rows[0].primaryActionHref,
						actionLabel: data.rows[0].primaryActionLabel
					}
				: null)
	);

	function metricToneToSemanticTone(tone: TeacherAssessmentsMetricTone) {
		if (tone === 'positive') return 'healthy';
		if (tone === 'critical') return 'alert';
		if (tone === 'attention') return 'attention';
		return 'neutral';
	}

	function statusToneToSemanticTone(
		tone: TeacherAssessmentActionItem['statusTone'] | TeacherAssessmentTableRow['statusTone']
	) {
		if (tone === 'critical') return 'alert';
		if (tone === 'attention') return 'attention';
		if (tone === 'ready') return 'context';
		if (tone === 'published') return 'healthy';
		return 'neutral';
	}

	function stageTitle(stage: PipelineStage) {
		if (stage === 'drafts') return 'Rascunhos em andamento';
		if (stage === 'ready') return 'Prontas para revisão';
		if (stage === 'attention') return 'Publicadas com atenção';
		return 'Publicadas estáveis';
	}

	function stageDescription(stage: PipelineStage) {
		if (stage === 'drafts') {
			return 'Avaliações ainda abertas, com pendências de lançamento ou revisão antes de publicar.';
		}
		if (stage === 'ready') {
			return 'Avaliações já completas o suficiente para decisão de revisão e publicação.';
		}
		if (stage === 'attention') {
			return 'Publicações que merecem releitura porque a média, cobertura ou dispersão pedem cuidado.';
		}
		return 'Publicações consistentes que podem servir como referência do que está funcionando.';
	}

	function stageTone(stage: PipelineStage) {
		if (stage === 'drafts') return 'attention';
		if (stage === 'ready') return 'context';
		if (stage === 'attention') return 'alert';
		return 'healthy';
	}

	function formatStageCount(stage: PipelineStage, count: number) {
		if (stage === 'drafts') return count === 1 ? '1 rascunho' : `${count} rascunhos`;
		if (stage === 'ready')
			return count === 1 ? '1 avaliação pronta' : `${count} avaliações prontas`;
		if (stage === 'attention') {
			return count === 1 ? '1 publicação em atenção' : `${count} publicações em atenção`;
		}
		return count === 1 ? '1 publicação estável' : `${count} publicações estáveis`;
	}
</script>

<svelte:head>
	<title>Class Insights - Avaliações</title>
</svelte:head>

<div class="app-stack-lg">
	<section class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
		<div class="app-card-strong app-stack-md">
			<div class="app-header">
				<p class="app-eyebrow">Avaliações</p>
				<h1 class="app-title">Pipeline de revisão e publicação</h1>
				<p class="app-subtitle">
					Veja primeiro o que merece revisão, depois acompanhe o restante do fluxo por estágio.
				</p>
			</div>

			<div class="app-kpi-grid">
				{#each data.summaryMetrics as metric (`${metric.label}-${metric.value}`)}
					<MetricCard
						label={metric.label}
						value={metric.value}
						tone={metricToneToSemanticTone(metric.tone)}
						valueTone={metric.tone === 'neutral' ? 'default' : 'tone'}
						compact={true}
					/>
				{/each}
			</div>
		</div>

		{#if dominantNextStep}
			<NextStepCard
				eyebrow="Revisar primeiro"
				title={`${dominantNextStep.title} · ${dominantNextStep.className}`}
				description={dominantNextStep.nextStepText}
				tone={statusToneToSemanticTone(dominantNextStep.statusTone)}
				primaryHref={dominantNextStep.actionHref}
				primaryLabel={dominantNextStep.actionLabel}
				secondaryHref={resolve('/teacher/assessments')}
				secondaryLabel="Ver pipeline completo"
				primaryTone="healthy"
			/>
		{:else}
			<section class="app-card app-empty-state">
				<p class="app-empty-state-title">Nenhuma avaliação cadastrada ainda</p>
				<p class="app-empty-state-text">
					Crie a primeira avaliação para começar o pipeline de revisão e publicação.
				</p>
			</section>
		{/if}
	</section>

	{#if formMessage}
		<div
			class={`rounded-3xl border px-4 py-3 text-sm font-semibold ${
				formSuccess
					? 'border-emerald-200 bg-emerald-50 text-emerald-700'
					: 'border-red-200 bg-red-50 text-red-700'
			}`}
		>
			{formMessage}
		</div>
	{/if}

	{#if !data.schema.ready}
		<section class="app-empty-state">
			<p class="app-empty-state-title">A estrutura acadêmica da V1 ainda não está disponível</p>
			<p class="app-empty-state-text">{data.schema.message ?? 'Tente novamente mais tarde.'}</p>
		</section>
	{:else}
		<section class="app-card app-stack-md">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div class="app-header">
					<p class="app-eyebrow">Criar nova avaliação</p>
					<h2 class="app-title">Adicionar ao pipeline</h2>
					<p class="app-subtitle">
						Crie uma avaliação já dentro do fluxo oficial da V1: matéria, avaliação, lançamento,
						revisão e publicação.
					</p>
				</div>
			</div>

			{#if data.classes.length === 0}
				<div class="app-empty-state">
					<p class="app-empty-state-title">Você ainda não tem turmas</p>
					<p class="app-empty-state-text">Crie uma turma antes de cadastrar avaliações.</p>
				</div>
			{:else}
				<form method="POST" class="grid gap-4 lg:grid-cols-2">
					<div class="grid gap-4">
						<div>
							<label for="class_id" class="block text-sm font-black text-slate-900">Turma</label>
							<select
								id="class_id"
								name="class_id"
								class="app-select mt-2"
								bind:value={selectedClassId}
							>
								{#each data.classes as classOption (classOption.id)}
									<option value={classOption.id}>{classOption.name}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="subject_id" class="block text-sm font-black text-slate-900">Matéria</label
							>
							<select
								id="subject_id"
								name="subject_id"
								class="app-select mt-2"
								disabled={availableSubjects.length === 0}
							>
								{#if availableSubjects.length === 0}
									<option value="">Nenhuma matéria vinculada a esta turma</option>
								{:else}
									{#each availableSubjects as subject (subject.id)}
										<option value={subject.id}>
											{subject.name}{subject.code ? ` · ${subject.code}` : ''}
										</option>
									{/each}
								{/if}
							</select>
						</div>
					</div>

					<div class="grid gap-4">
						<div>
							<label for="title" class="block text-sm font-black text-slate-900">Título</label>
							<input
								id="title"
								name="title"
								type="text"
								class="app-input mt-2"
								placeholder="Ex.: Prova 1, Atividade diagnóstica, Simulado"
								required
							/>
						</div>

						<div class="grid gap-4 sm:grid-cols-2">
							<div>
								<label for="assessment_date" class="block text-sm font-black text-slate-900">
									Data
								</label>
								<input
									id="assessment_date"
									name="assessment_date"
									type="date"
									class="app-input mt-2"
									required
								/>
							</div>

							<div>
								<label for="weight" class="block text-sm font-black text-slate-900">Peso</label>
								<input
									id="weight"
									name="weight"
									type="number"
									min="0.1"
									step="0.1"
									value="1"
									class="app-input mt-2"
									required
								/>
							</div>
						</div>

						<input type="hidden" name="status" value="draft" />

						<div class="flex flex-wrap gap-3 pt-2">
							<a href={resolve('/teacher/subjects')} class="app-button-secondary"> Ver matérias </a>

							<button
								type="submit"
								formaction="?/createAssessment"
								class="app-button"
								disabled={availableSubjects.length === 0}
							>
								Criar avaliação
							</button>
						</div>
					</div>
				</form>
			{/if}
		</section>

		<section class="app-stack-lg">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div class="app-header">
					<p class="app-eyebrow">Revisar primeiro</p>
					<h2 class="app-title">Avaliações que merecem atenção agora</h2>
					<p class="app-subtitle">
						Estas avaliações concentram o próximo clique mais relevante do pipeline.
					</p>
				</div>
			</div>

			{#if reviewFirstItems.length === 0}
				<div class="app-empty-state">
					<p class="app-empty-state-title">Nada para priorizar agora</p>
					<p class="app-empty-state-text">
						Assim que houver avaliações no fluxo, esta área mostrará o que revisar primeiro.
					</p>
				</div>
			{:else}
				<div class="grid gap-4 xl:grid-cols-3">
					{#each reviewFirstItems as item (item.id)}
						<article class="app-card app-stack-md">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="text-lg font-black text-slate-950">{item.title}</p>
									<p class="mt-1 text-sm text-slate-600">{item.className} · {item.subjectName}</p>
								</div>

								<StatusPill
									label={item.statusLabel}
									tone={statusToneToSemanticTone(item.statusTone)}
									uppercase={true}
								/>
							</div>

							<div class="grid gap-3 sm:grid-cols-3">
								<MetricCard label="Cobertura" value={item.coverageLabel} compact={true} />
								<MetricCard label="Média" value={item.averageLabel} compact={true} />
								<MetricCard label="Data" value={item.dateLabel} compact={true} />
							</div>

							<p class="text-sm leading-7 text-slate-600">{item.nextStepText}</p>

							<div class="flex flex-wrap gap-3">
								<a href={item.actionHref} class="app-button">
									{item.actionLabel}
								</a>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>

		<section class="app-stack-lg">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div class="app-header">
					<p class="app-eyebrow">Pipeline</p>
					<h2 class="app-title">Fluxo por estágio operacional</h2>
					<p class="app-subtitle">
						Acompanhe onde cada avaliação está: rascunho, pronta para revisão, publicada com atenção
						ou publicada estável.
					</p>
				</div>
			</div>

			<div class="grid gap-4 2xl:grid-cols-2">
				{#each ['drafts', 'ready', 'attention', 'stable'] as PipelineStage[] as stage (stage)}
					<section class="app-card app-stack-md">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<h3 class="text-xl font-black text-slate-950">{stageTitle(stage)}</h3>
								<p class="mt-2 text-sm leading-7 text-slate-600">{stageDescription(stage)}</p>
							</div>

							<StatusPill
								label={formatStageCount(stage, pipeline[stage].length)}
								tone={stageTone(stage)}
							/>
						</div>

						{#if pipeline[stage].length === 0}
							<div class="app-empty-state">
								<p class="app-empty-state-title">Nada neste estágio</p>
								<p class="app-empty-state-text">
									Quando avaliações entrarem nesta fase, elas aparecerão aqui com a próxima ação.
								</p>
							</div>
						{:else}
							<div class="grid gap-3">
								{#each pipeline[stage] as row (row.id)}
									<article class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
										<div class="flex flex-wrap items-start justify-between gap-3">
											<div class="min-w-0">
												<p class="text-base font-black text-slate-950">{row.title}</p>
												<p class="mt-1 text-sm text-slate-600">
													{row.className} · {row.subjectName}
												</p>
											</div>

											<StatusPill
												label={row.statusLabel}
												tone={statusToneToSemanticTone(row.statusTone)}
												uppercase={true}
											/>
										</div>

										<div class="mt-4 grid gap-3 md:grid-cols-3">
											<MetricCard label="Cobertura" value={row.coverageLabel} compact={true} />
											<MetricCard label="Média" value={row.averageLabel} compact={true} />
											<MetricCard
												label="Pendências"
												value={String(row.pendingResultsCount)}
												tone={row.pendingResultsCount > 0 ? 'attention' : 'healthy'}
												valueTone={row.pendingResultsCount > 0 ? 'tone' : 'default'}
												compact={true}
											/>
										</div>

										<p class="mt-4 text-sm leading-7 text-slate-600">{row.insightLabel}</p>

										<div class="mt-4 flex flex-wrap items-center gap-3">
											<a href={row.primaryActionHref} class="app-button">
												{row.primaryActionLabel}
											</a>

											<span class="text-sm font-semibold text-slate-500">
												{row.assessmentDateLabel}
											</span>
										</div>
									</article>
								{/each}
							</div>
						{/if}
					</section>
				{/each}
			</div>
		</section>

		<section class="app-card app-stack-md">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div class="app-header">
					<p class="app-eyebrow">Tabela de apoio</p>
					<h2 class="app-title">Buscar e conferir todas as avaliações</h2>
					<p class="app-subtitle">
						Use a tabela como apoio operacional para filtrar, localizar e abrir uma avaliação
						específica.
					</p>
				</div>
			</div>

			<div
				class="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(180px,1fr))_minmax(180px,1fr)]"
			>
				<div>
					<label for="assessment-search" class="block text-sm font-black text-slate-900">
						Buscar
					</label>
					<input
						id="assessment-search"
						type="text"
						class="app-input mt-2"
						bind:value={search}
						placeholder="Título, turma ou matéria"
					/>
				</div>

				<div>
					<label for="assessment-class-filter" class="block text-sm font-black text-slate-900">
						Turma
					</label>
					<select id="assessment-class-filter" class="app-select mt-2" bind:value={classFilter}>
						<option value="all">Todas</option>
						{#each data.classes as classOption (classOption.id)}
							<option value={classOption.id}>{classOption.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="assessment-subject-filter" class="block text-sm font-black text-slate-900">
						Matéria
					</label>
					<select id="assessment-subject-filter" class="app-select mt-2" bind:value={subjectFilter}>
						<option value="all">Todas</option>
						{#each filteredSubjects as subject (subject.id)}
							<option value={subject.id}>
								{subject.name}{subject.code ? ` · ${subject.code}` : ''}
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="assessment-status-filter" class="block text-sm font-black text-slate-900">
						Status
					</label>
					<select id="assessment-status-filter" class="app-select mt-2" bind:value={statusFilter}>
						<option value="all">Todos</option>
						<option value="draft">Rascunho</option>
						<option value="ready">Pronta para revisão</option>
						<option value="published">Publicada</option>
						<option value="attention">Em atenção</option>
						<option value="critical">Crítica</option>
					</select>
				</div>

				<div>
					<label for="assessment-sort" class="block text-sm font-black text-slate-900">
						Ordenar
					</label>
					<select id="assessment-sort" class="app-select mt-2" bind:value={sortBy}>
						<option value="priority">Prioridade</option>
						<option value="recent">Mais recentes</option>
						<option value="oldest">Mais antigas</option>
						<option value="coverage">Maior cobertura</option>
						<option value="average">Maior média</option>
					</select>
				</div>
			</div>

			{#if filteredRows.length === 0}
				<div class="app-empty-state">
					<p class="app-empty-state-title">Nenhuma avaliação encontrada</p>
					<p class="app-empty-state-text">
						Ajuste os filtros ou crie uma nova avaliação para alimentar o pipeline.
					</p>
				</div>
			{:else}
				<div class="overflow-x-auto rounded-3xl border border-slate-200">
					<table class="min-w-full border-collapse bg-white text-left">
						<thead class="bg-slate-50">
							<tr class="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
								<th class="px-4 py-3">Avaliação</th>
								<th class="px-4 py-3">Status</th>
								<th class="px-4 py-3">Cobertura</th>
								<th class="px-4 py-3">Média</th>
								<th class="px-4 py-3">Leitura</th>
								<th class="px-4 py-3">Próxima ação</th>
							</tr>
						</thead>

						<tbody>
							{#each filteredRows as row (row.id)}
								<tr class="border-t border-slate-200 align-top">
									<td class="px-4 py-4">
										<p class="font-black text-slate-950">{row.title}</p>
										<p class="mt-1 text-sm text-slate-600">{row.className} · {row.subjectName}</p>
										<p
											class="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
										>
											{row.assessmentDateLabel}
										</p>
									</td>

									<td class="px-4 py-4">
										<StatusPill
											label={row.statusLabel}
											tone={statusToneToSemanticTone(row.statusTone)}
											uppercase={true}
										/>
									</td>

									<td class="px-4 py-4 text-sm font-semibold text-slate-700">
										{row.coverageLabel}
									</td>

									<td class="px-4 py-4 text-sm font-semibold text-slate-700">
										{row.averageLabel}
									</td>

									<td class="px-4 py-4">
										<p class="max-w-sm text-sm leading-7 text-slate-600">{row.insightLabel}</p>
									</td>

									<td class="px-4 py-4">
										<a href={row.primaryActionHref} class="app-button-secondary">
											{row.primaryActionLabel}
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/if}
</div>
