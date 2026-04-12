<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';

	import MetricCard from '$lib/components/shared/MetricCard.svelte';
	import NextStepCard from '$lib/components/shared/NextStepCard.svelte';
	import StatusPill from '$lib/components/shared/StatusPill.svelte';
	import type { TeacherClassesPageData } from './+page.server';

	type Props = {
		data: TeacherClassesPageData;
	};

	type FormState = {
		action?: 'deleteClass' | 'generateClassSnapshot' | 'createClass';
		message?: string;
		success?: boolean;
	};

	type HealthFilter = 'all' | 'em_operacao' | 'com_alerta' | 'sem_avaliacao' | 'sem_materia';
	type SortOption = 'priority' | 'name' | 'coverage' | 'trend' | 'average';

	let { data }: Props = $props();

	let search = $state('');
	let healthFilter = $state<HealthFilter>('all');
	let sortBy = $state<SortOption>('priority');

	const formState = $derived(($page.form ?? null) as FormState | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);

	function parsePtBrNumber(raw: string) {
		const normalized = raw.replace(/\s+/g, '').replace(',', '.');
		const value = Number(normalized);
		return Number.isFinite(value) ? value : null;
	}

	function parsePublishedAverage(label: string) {
		const [rawAverage] = label.split('/');
		return parsePtBrNumber((rawAverage ?? '').trim());
	}

	function parseCoverage(label: string) {
		const normalized = label.replace('%', '').trim();
		const value = Number(normalized);
		return Number.isFinite(value) ? value : null;
	}

	function parseTrend(label: string) {
		const normalized = label.trim().toLowerCase();
		if (!normalized || normalized === 'estável' || normalized === 'estavel') return 0;
		return parsePtBrNumber(label.replace('+', '').trim()) ?? 0;
	}

	function normalizeText(value: string) {
		return value
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase()
			.trim();
	}

	function healthLabel(
		status: HealthFilter | TeacherClassesPageData['classesSummary'][number]['classHealthStatus']
	) {
		if (status === 'em_operacao') return 'Em operação';
		if (status === 'com_alerta') return 'Com alerta';
		if (status === 'sem_avaliacao') return 'Sem avaliação';
		if (status === 'sem_materia') return 'Sem matéria';
		return 'Todas';
	}

	function healthTone(
		status: TeacherClassesPageData['classesSummary'][number]['classHealthStatus']
	) {
		if (status === 'em_operacao') return 'healthy';
		if (status === 'com_alerta') return 'attention';
		if (status === 'sem_avaliacao') return 'neutral';
		return 'alert';
	}

	function summaryMetricTone(tone: 'neutral' | 'attention' | 'critical') {
		if (tone === 'critical') return 'alert';
		if (tone === 'attention') return 'attention';
		return 'neutral';
	}

	function trendTone(value: string) {
		const parsed = parseTrend(value);
		if (parsed < 0) return 'attention';
		if (parsed > 0) return 'healthy';
		return 'context';
	}

	function trendLabel(label: string) {
		const parsed = parseTrend(label);
		if (parsed < 0) return 'Em queda';
		if (parsed > 0) return 'Em melhora';
		return 'Estável';
	}

	function coverageTone(label: string) {
		const parsed = parseCoverage(label);
		if (parsed === null) return 'neutral';
		if (parsed < 50) return 'alert';
		if (parsed < 75) return 'attention';
		return 'healthy';
	}

	function averageTone(label: string) {
		const parsed = parsePublishedAverage(label);
		if (parsed === null) return 'neutral';
		if (parsed < 5) return 'alert';
		if (parsed < 7) return 'attention';
		return 'healthy';
	}

	function sortByPriority(
		a: TeacherClassesPageData['classesSummary'][number],
		b: TeacherClassesPageData['classesSummary'][number]
	) {
		const order = {
			com_alerta: 0,
			sem_materia: 1,
			sem_avaliacao: 2,
			em_operacao: 3
		} as const;

		const healthDiff = order[a.classHealthStatus] - order[b.classHealthStatus];
		if (healthDiff !== 0) return healthDiff;

		const trendDiff = parseTrend(a.trendLabel) - parseTrend(b.trendLabel);
		if (trendDiff !== 0) return trendDiff;

		const coverageDiff =
			(parseCoverage(a.coverageLabel) ?? 100) - (parseCoverage(b.coverageLabel) ?? 100);
		if (coverageDiff !== 0) return coverageDiff;

		return a.className.localeCompare(b.className, 'pt-BR');
	}

	const filteredClasses = $derived.by(() => {
		const query = normalizeText(search);

		const items = data.classesSummary.filter((item) => {
			const matchesSearch =
				query.length === 0 ||
				normalizeText(item.className).includes(query) ||
				normalizeText(item.mainIssue).includes(query) ||
				normalizeText(item.nextAction.reason).includes(query);

			const matchesHealth = healthFilter === 'all' || item.classHealthStatus === healthFilter;

			return matchesSearch && matchesHealth;
		});

		return [...items].sort((a, b) => {
			if (sortBy === 'name') {
				return a.className.localeCompare(b.className, 'pt-BR');
			}

			if (sortBy === 'coverage') {
				return (parseCoverage(b.coverageLabel) ?? -1) - (parseCoverage(a.coverageLabel) ?? -1);
			}

			if (sortBy === 'trend') {
				return parseTrend(a.trendLabel) - parseTrend(b.trendLabel);
			}

			if (sortBy === 'average') {
				return (
					(parsePublishedAverage(a.publishedAverageLabel) ?? -1) -
					(parsePublishedAverage(b.publishedAverageLabel) ?? -1)
				);
			}

			return sortByPriority(a, b);
		});
	});

	function confirmDelete(className: string) {
		return confirm(`Excluir a turma "${className}"? Essa ação não pode ser desfeita.`);
	}
</script>

<svelte:head>
	<title>Class Insights - Turmas</title>
</svelte:head>

<div class="app-stack-lg">
	<section class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
		<div class="app-card-strong app-stack-md">
			<div class="app-header">
				<p class="app-eyebrow">Turmas</p>
				<h1 class="app-title">Gestão das turmas em operação</h1>
				<p class="app-subtitle">
					Cada card mostra a saúde da turma, a cobertura, a tendência e o principal problema para
					você saber onde agir primeiro.
				</p>
			</div>

			<div class="app-kpi-grid">
				{#each data.summaryMetrics as metric (`${metric.label}-${metric.value}`)}
					<MetricCard
						label={metric.label}
						value={metric.value}
						tone={summaryMetricTone(metric.tone)}
						valueTone={metric.tone === 'neutral' ? 'default' : 'tone'}
						compact={true}
					/>
				{/each}
			</div>

			{#if data.error}
				<div
					class="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
				>
					{data.error}
				</div>
			{/if}

			<p class="text-sm text-slate-500">Última atualização: {data.syncLabel}</p>
		</div>

		{#if data.urgentClasses.length > 0}
			<NextStepCard
				eyebrow="Prioridade"
				title={data.urgentClasses[0].className}
				description={data.urgentClasses[0].mainIssue}
				tone={healthTone(data.urgentClasses[0].classHealthStatus)}
				primaryHref={data.urgentClasses[0].nextAction.href}
				primaryLabel={data.urgentClasses[0].nextAction.label}
				secondaryHref={data.urgentClasses[0].openHref}
				secondaryLabel="Abrir turma"
				primaryTone="healthy"
			/>
		{:else}
			<section class="app-card app-empty-state">
				<p class="app-empty-state-title">Nenhuma prioridade crítica agora</p>
				<p class="app-empty-state-text">
					As turmas aparecem aqui conforme entram em operação e passam a gerar leitura acionável.
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

	<section class="app-card app-stack-md">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
			<div class="app-header">
				<p class="app-eyebrow">Leitura rápida</p>
				<h2 class="app-title">Turmas que merecem olhar primeiro</h2>
				<p class="app-subtitle">
					Este bloco resume as turmas mais urgentes antes de você entrar nos cards completos.
				</p>
			</div>

			<a href={resolve('/teacher/classes/new')} class="app-button"> Criar turma </a>
		</div>

		{#if data.urgentClasses.length === 0}
			<div class="app-empty-state">
				<p class="app-empty-state-title">Nenhuma turma prioritária neste momento</p>
				<p class="app-empty-state-text">
					Quando houver alertas, cobertura baixa ou bloqueios de fluxo, eles aparecerão aqui.
				</p>
			</div>
		{:else}
			<div class="grid gap-4 xl:grid-cols-3">
				{#each data.urgentClasses as item (item.classId)}
					<article class="app-card app-stack-md">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="text-lg font-black text-slate-950">{item.className}</p>
								<p class="mt-1 text-sm text-slate-600">{item.mainIssue}</p>
							</div>

							<StatusPill
								label={healthLabel(item.classHealthStatus)}
								tone={healthTone(item.classHealthStatus)}
								uppercase={true}
							/>
						</div>

						<div class="grid gap-3 sm:grid-cols-3">
							<MetricCard
								label="Cobertura"
								value={item.coverageLabel}
								tone={coverageTone(item.coverageLabel)}
								valueTone="tone"
								compact={true}
							/>
							<MetricCard
								label="Tendência"
								value={trendLabel(item.trendLabel)}
								tone={trendTone(item.trendLabel)}
								valueTone="tone"
								compact={true}
							/>
							<MetricCard
								label="Média"
								value={item.publishedAverageLabel}
								tone={averageTone(item.publishedAverageLabel)}
								valueTone="tone"
								compact={true}
							/>
						</div>

						<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
								Próximo passo
							</p>
							<p class="mt-2 text-sm font-semibold text-slate-900">{item.nextAction.reason}</p>
						</div>

						<div class="flex flex-wrap gap-3">
							<a href={item.nextAction.href} class="app-button">
								{item.nextAction.label}
							</a>
							<a href={item.openHref} class="app-button-secondary"> Abrir turma </a>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<section class="app-card app-stack-md">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
			<div class="app-header">
				<p class="app-eyebrow">Todas as turmas</p>
				<h2 class="app-title">Cards de gestão por turma</h2>
				<p class="app-subtitle">
					Cada card resume estado da turma, principal problema e ação recomendada, sem parecer
					catálogo.
				</p>
			</div>
		</div>

		<div class="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(200px,1fr)_minmax(200px,1fr)]">
			<div>
				<label for="class-search" class="block text-sm font-black text-slate-900">Buscar</label>
				<input
					id="class-search"
					type="text"
					bind:value={search}
					class="app-input mt-2"
					placeholder="Nome da turma, problema principal ou ação"
				/>
			</div>

			<div>
				<label for="health-filter" class="block text-sm font-black text-slate-900">Saúde</label>
				<select id="health-filter" bind:value={healthFilter} class="app-select mt-2">
					<option value="all">Todas</option>
					<option value="em_operacao">Em operação</option>
					<option value="com_alerta">Com alerta</option>
					<option value="sem_avaliacao">Sem avaliação</option>
					<option value="sem_materia">Sem matéria</option>
				</select>
			</div>

			<div>
				<label for="sort-by" class="block text-sm font-black text-slate-900">Ordenar</label>
				<select id="sort-by" bind:value={sortBy} class="app-select mt-2">
					<option value="priority">Prioridade</option>
					<option value="name">Nome</option>
					<option value="coverage">Cobertura</option>
					<option value="trend">Tendência</option>
					<option value="average">Média</option>
				</select>
			</div>
		</div>

		{#if filteredClasses.length === 0}
			<div class="app-empty-state">
				<p class="app-empty-state-title">Nenhuma turma encontrada</p>
				<p class="app-empty-state-text">
					Ajuste os filtros ou crie uma nova turma para começar a leitura operacional.
				</p>
			</div>
		{:else}
			<div class="grid gap-4 xl:grid-cols-2">
				{#each filteredClasses as item (item.classId)}
					<article class="app-card-strong app-stack-md">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0">
								<h3 class="text-2xl font-black tracking-tight text-slate-950">{item.className}</h3>
								<p class="mt-2 text-sm leading-7 text-slate-600">{item.mainIssue}</p>
							</div>

							<StatusPill
								label={healthLabel(item.classHealthStatus)}
								tone={healthTone(item.classHealthStatus)}
								uppercase={true}
							/>
						</div>

						<div class="grid gap-3 md:grid-cols-3">
							<MetricCard
								label="Cobertura"
								value={item.coverageLabel}
								tone={coverageTone(item.coverageLabel)}
								valueTone="tone"
								compact={true}
							/>
							<MetricCard
								label="Tendência"
								value={trendLabel(item.trendLabel)}
								tone={trendTone(item.trendLabel)}
								valueTone="tone"
								compact={true}
							/>
							<MetricCard
								label="Média publicada"
								value={item.publishedAverageLabel}
								tone={averageTone(item.publishedAverageLabel)}
								valueTone="tone"
								compact={true}
							/>
						</div>

						<div class="flex flex-wrap gap-2">
							{#each item.tags as tag (`${item.classId}-${tag}`)}
								<StatusPill label={tag} tone="neutral" />
							{/each}
						</div>

						<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
								Próxima ação
							</p>
							<p class="mt-2 text-base font-black text-slate-950">{item.nextAction.label}</p>
							<p class="mt-2 text-sm leading-7 text-slate-600">{item.nextAction.reason}</p>
						</div>

						<div class="flex flex-wrap gap-3">
							<a href={item.nextAction.href} class="app-button">
								{item.nextAction.label}
							</a>

							<a href={item.openHref} class="app-button-secondary"> Abrir turma </a>

							<form method="POST" action="?/generateClassSnapshot">
								<input type="hidden" name="classId" value={item.classId} />
								<button type="submit" class="app-button-secondary"> Atualizar leitura </button>
							</form>

							<form method="POST" action="?/deleteClass">
								<input type="hidden" name="classId" value={item.classId} />
								<button
									type="submit"
									class="app-button-ghost text-red-700"
									onclick={(event) => {
										if (!confirmDelete(item.className)) {
											event.preventDefault();
										}
									}}
								>
									Excluir
								</button>
							</form>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</div>
