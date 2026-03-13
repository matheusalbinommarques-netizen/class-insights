<script lang="ts">
	import { page } from '$app/stores';

	type ActionFeedback = {
		action?: 'createClass' | 'deleteClass' | 'generateClassSnapshot';
		message?: string;
		success?: boolean;
	};

	type Summary = {
		displayName: string;
		totalClasses: number;
		totalStudents: number;
		totalRiskStudents: number;
		totalPendingCells: number;
		classesNeedingSnapshot: number;
		classesAtRisk: number;
		classesInSetup: number;
		healthyClasses: number;
		message: string;
	};

	type ClassCard = {
		id: string;
		name: string;
		created_at: string;
		scaleLabel: string;
		studentsCount: number;
		skillsCount: number;
		filledScoresCount: number;
		totalExpectedCells: number;
		pendingCells: number;
		coveragePercent: number;
		averagePercent: number | null;
		riskStudentsCount: number;
		latestSnapshotDate: string | null;
		needsSnapshot: boolean;
		trendDelta: number | null;
		focusSkills: string[];
		status: 'setup' | 'healthy' | 'attention' | 'critical';
	};

	type ActionQueueItem = {
		id: string;
		classId: string;
		title: string;
		description: string;
		ctaLabel: string;
		href: string;
		priority: number;
	};

	type ClassFilter = 'all' | 'setup' | 'healthy' | 'attention' | 'critical';
	type StatTone = 'good' | 'neutral' | 'warn' | 'danger';

	type TopStatItem = {
		label: string;
		value: number;
		foot: string;
		tone: StatTone;
	};

	type FilterChip = {
		filter: ClassFilter;
		label: string;
		count: number;
	};

	type Props = {
		data: {
			classes: ClassCard[];
			actionQueue: ActionQueueItem[];
			summary: Summary;
			error: string | null;
		};
	};

	let { data }: Props = $props();

	let newMin = $state(0);
	let newMax = $state(10);
	let newDecimals = $state(0);
	let selectedFilter = $state<ClassFilter>('all');
	let showCreateForm = $state(false);
	let createFormInitialized = $state(false);

	$effect(() => {
		if (!createFormInitialized) {
			showCreateForm = data.classes.length === 0;
			createFormInitialized = true;
		}
	});

	const formState = $derived(($page.form ?? null) as ActionFeedback | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);

	const hasClasses = $derived(data.classes.length > 0);

	const sortedActionQueue = $derived.by(() =>
		[...data.actionQueue].sort((a, b) => a.priority - b.priority)
	);

	const firstPriorityAction = $derived.by(() => sortedActionQueue[0] ?? null);

	const filterChips = $derived.by(
		(): FilterChip[] => [
			{
				filter: 'all',
				label: 'Todas',
				count: data.classes.length
			},
			{
				filter: 'critical',
				label: 'Críticas',
				count: data.classes.filter((c) => c.status === 'critical').length
			},
			{
				filter: 'attention',
				label: 'Atenção',
				count: data.classes.filter((c) => c.status === 'attention').length
			},
			{
				filter: 'setup',
				label: 'Setup',
				count: data.classes.filter((c) => c.status === 'setup').length
			},
			{
				filter: 'healthy',
				label: 'Saudáveis',
				count: data.classes.filter((c) => c.status === 'healthy').length
			}
		]
	);

	const visibleClasses = $derived.by(() =>
		selectedFilter === 'all'
			? data.classes
			: data.classes.filter((classCard) => classCard.status === selectedFilter)
	);

	const topStats = $derived.by(
		(): TopStatItem[] => [
			{
				label: 'Turmas ativas',
				value: data.summary.totalClasses,
				foot: 'Portfólio atual',
				tone: 'neutral'
			},
			{
				label: 'Turmas em risco',
				value: data.summary.classesAtRisk,
				foot: 'Pedem atenção',
				tone: 'warn'
			},
			{
				label: 'Alunos em risco',
				value: data.summary.totalRiskStudents,
				foot: 'Precisam de leitura',
				tone: 'danger'
			},
			{
				label: 'Snapshots pendentes',
				value: data.summary.classesNeedingSnapshot,
				foot: 'Base ainda não consolidada',
				tone: 'neutral'
			}
		]
	);

	const quickGuidance = $derived.by(() =>
		data.summary.totalClasses === 0
			? [
					'Crie sua primeira turma',
					'Cadastre skills e alunos',
					'Comece a lançar ou importar notas'
				]
			: [
					'Priorize turmas com risco alto',
					'Gere snapshot após novos lançamentos',
					'Use importação para acelerar cobertura'
				]
	);

	function formatDate(value: string | null) {
		if (!value) return 'Nunca';
		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return 'Data indisponível';

		return new Intl.DateTimeFormat('pt-BR', {
			dateStyle: 'medium'
		}).format(date);
	}

	function formatPercent(value: number | null) {
		if (typeof value !== 'number') return '—';
		return `${value}%`;
	}

	function formatDelta(value: number | null) {
		if (typeof value !== 'number') return 'Sem baseline';
		const rounded = value.toFixed(2);
		return `${value >= 0 ? '+' : ''}${rounded}`;
	}

	function statusLabel(status: ClassCard['status']) {
		if (status === 'healthy') return 'Saudável';
		if (status === 'attention') return 'Atenção';
		if (status === 'critical') return 'Crítica';
		return 'Configuração';
	}

	function statusBadgeClass(status: ClassCard['status']) {
		if (status === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (status === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		if (status === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		return 'border-sky-200 bg-sky-50 text-sky-700';
	}

	function coverageClass(coverage: number) {
		if (coverage < 50) return 'text-red-700';
		if (coverage < 85) return 'text-amber-700';
		return 'text-emerald-700';
	}

	function deltaClass(value: number | null) {
		if (typeof value !== 'number') return 'text-slate-500';
		if (value >= 0) return 'text-emerald-700';
		return 'text-red-700';
	}

	function statCardTone(tone: StatTone) {
		if (tone === 'good') return 'border-emerald-200 bg-emerald-50';
		if (tone === 'warn') return 'border-amber-200 bg-amber-50';
		if (tone === 'danger') return 'border-red-200 bg-red-50';
		return 'border-slate-200 bg-white';
	}

	function filterButtonClass(filter: ClassFilter) {
		const isActive = selectedFilter === filter;

		if (!isActive) {
			return 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900';
		}

		if (filter === 'healthy') {
			return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		}

		if (filter === 'attention') {
			return 'border-amber-200 bg-amber-50 text-amber-700';
		}

		if (filter === 'critical') {
			return 'border-red-200 bg-red-50 text-red-700';
		}

		if (filter === 'setup') {
			return 'border-sky-200 bg-sky-50 text-sky-700';
		}

		return 'border-slate-300 bg-slate-100 text-slate-900';
	}

	function criticalHint(classCard: ClassCard) {
		if (classCard.studentsCount === 0) {
			return 'Turma criada, mas ainda sem alunos.';
		}

		if (classCard.skillsCount === 0) {
			return 'Turma sem skills cadastradas.';
		}

		if (classCard.pendingCells > 0) {
			return `${classCard.pendingCells} pendência(s) de lançamento ainda abertas.`;
		}

		if (classCard.needsSnapshot) {
			return 'Já existe dado novo sem snapshot atualizado.';
		}

		if (classCard.riskStudentsCount > 0) {
			return `${classCard.riskStudentsCount} aluno(s) em risco nesta turma.`;
		}

		return 'Turma operacional sem alertas críticos neste momento.';
	}

	function coverageBarClass(coverage: number) {
		if (coverage < 50) return 'bg-red-500';
		if (coverage < 85) return 'bg-amber-500';
		return 'bg-emerald-500';
	}

	function confirmDelete(event: MouseEvent) {
		if (!confirm('Deletar esta turma? Isso remove alunos, skills e scores.')) {
			event.preventDefault();
		}
	}
</script>

<svelte:head>
	<title>Teacher Dashboard • Class Insights</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
			<div class="max-w-3xl">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">
					Workspace do professor
				</p>

				<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
					Bom trabalho, {data.summary.displayName}.
				</h1>

				<p class="mt-3 text-base leading-8 text-slate-600">
					{data.summary.message}
				</p>

				<div class="mt-5 flex flex-wrap gap-3">
					<button
						type="button"
						class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
						onclick={() => (showCreateForm = !showCreateForm)}
					>
						<span>{showCreateForm ? 'Ocultar nova turma' : 'Criar nova turma'}</span>
					</button>

					<a
						href="/teacher/import"
						class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
					>
						<span>Importar notas</span>
					</a>

					{#if firstPriorityAction}
						<a
							href={firstPriorityAction.href}
							class="inline-flex h-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-5 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
						>
							<span>Ver turma prioritária</span>
						</a>
					{/if}
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2 xl:w-full xl:max-w-sm">
				{#each topStats as stat}
					<div class={`rounded-2xl border p-4 ${statCardTone(stat.tone)}`}>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							{stat.label}
						</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{stat.value}</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">{stat.foot}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

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

	{#if data.error}
		<div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
			{data.error}
		</div>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[1.65fr_0.85fr]">
		<div class="space-y-6">
			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Fila de ação
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							O que merece atenção agora
						</h2>
					</div>

					<p class="max-w-xl text-sm leading-7 text-slate-600">
						As próximas melhores ações aparecem aqui primeiro, para o professor decidir rápido
						sem precisar procurar o problema no dashboard.
					</p>
				</div>

				{#if sortedActionQueue.length === 0}
					<div class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
						<h3 class="text-lg font-black text-slate-950">Nenhuma pendência urgente</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Suas turmas não têm alertas prioritários neste momento. Você pode seguir com
							importações, novas avaliações ou criação de novas turmas.
						</p>
					</div>
				{:else}
					<div class="mt-5 space-y-3">
						{#each sortedActionQueue as item}
							<article class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
								<div class="min-w-0">
									<p class="text-base font-black text-slate-950">{item.title}</p>
									<p class="mt-1 text-sm leading-7 text-slate-600">{item.description}</p>
								</div>

								<a
									href={item.href}
									class="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
								>
									<span>{item.ctaLabel}</span>
								</a>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Cockpit de turmas
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							Turmas vivas, não só cadastradas
						</h2>
						<p class="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
							Cobertura, risco, pendências, snapshot e tendência aparecem com prioridade para
							ajudar na decisão do professor.
						</p>
					</div>

					<div class="flex flex-wrap gap-2">
						{#each filterChips as chip}
							<button
								type="button"
								class={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition ${filterButtonClass(chip.filter)}`}
								onclick={() => (selectedFilter = chip.filter)}
							>
								<span>{chip.label}</span>
								<span class="rounded-full bg-white/80 px-2 py-0.5 text-xs font-black">
									{chip.count}
								</span>
							</button>
						{/each}
					</div>
				</div>

				{#if !hasClasses}
					<div class="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
						<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-xl font-black text-white shadow-sm">
							CI
						</div>

						<h3 class="mt-4 text-2xl font-black tracking-tight text-slate-950">
							Pronto para criar a primeira turma?
						</h3>

						<p class="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
							Comece pelo fluxo essencial: turma, skills, alunos, lançamento de notas e leitura
							de progresso.
						</p>

						<button
							type="button"
							class="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
							onclick={() => (showCreateForm = true)}
						>
							<span>Criar primeira turma</span>
						</button>
					</div>
				{:else if visibleClasses.length === 0}
					<div class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
						<h3 class="text-lg font-black text-slate-950">Nenhuma turma nesse filtro</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Troque o filtro para visualizar outras turmas do workspace.
						</p>
					</div>
				{:else}
					<div class="mt-6 grid gap-4">
						{#each visibleClasses as c}
							<article class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
								<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-3">
											<h3 class="text-2xl font-black tracking-tight text-slate-950">
												{c.name}
											</h3>

											<span class={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${statusBadgeClass(c.status)}`}>
												{statusLabel(c.status)}
											</span>
										</div>

										<p class="mt-2 text-sm leading-7 text-slate-600">
											Criada em {formatDate(c.created_at)} • {c.scaleLabel}
										</p>
									</div>

									<div class="flex items-center gap-2">
										{#if c.needsSnapshot}
											<span class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-sky-700">
												snapshot pendente
											</span>
										{/if}

										<details class="relative">
											<summary class="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-100">
												⋯
											</summary>

											<div class="absolute right-0 top-12 z-10 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
												<form method="POST" action="?/deleteClass">
													<input type="hidden" name="classId" value={c.id} />
													<button
														type="submit"
														class="flex h-11 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-700 transition hover:bg-red-100"
														onclick={confirmDelete}
													>
														Excluir turma
													</button>
												</form>
											</div>
										</details>
									</div>
								</div>

								<div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
									<p class="text-sm font-semibold text-slate-900">{criticalHint(c)}</p>
								</div>

								<div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
									<div class="flex items-center justify-between gap-3">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Cobertura da turma
										</p>
										<p class={`text-sm font-black ${coverageClass(c.coveragePercent)}`}>
											{c.coveragePercent}%
										</p>
									</div>

									<div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
										<div
											class={`h-full rounded-full ${coverageBarClass(c.coveragePercent)}`}
											style={`width: ${Math.max(0, Math.min(100, c.coveragePercent))}%`}
										></div>
									</div>
								</div>

								<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Média
										</p>
										<p class="mt-2 text-2xl font-black text-slate-950">
											{formatPercent(c.averagePercent)}
										</p>
									</div>

									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Risco
										</p>
										<p class="mt-2 text-2xl font-black text-slate-950">
											{c.riskStudentsCount}
										</p>
									</div>

									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Snapshot
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{formatDate(c.latestSnapshotDate)}
										</p>
									</div>

									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Tendência
										</p>
										<p class={`mt-2 text-2xl font-black ${deltaClass(c.trendDelta)}`}>
											{formatDelta(c.trendDelta)}
										</p>
									</div>
								</div>

								<div class="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Alunos
										</p>
										<p class="mt-2 text-xl font-black text-slate-950">{c.studentsCount}</p>
									</div>

									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Skills
										</p>
										<p class="mt-2 text-xl font-black text-slate-950">{c.skillsCount}</p>
									</div>

									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Pendências
										</p>
										<p class="mt-2 text-xl font-black text-slate-950">{c.pendingCells}</p>
									</div>
								</div>

								{#if c.focusSkills.length > 0}
									<div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Top lacunas atuais
										</p>

										<div class="mt-3 flex flex-wrap gap-2">
											{#each c.focusSkills as skillName}
												<span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
													{skillName}
												</span>
											{/each}
										</div>
									</div>
								{/if}

								<div class="mt-5 flex flex-wrap gap-3">
									<a
										href={`/teacher/${c.id}`}
										class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
									>
										<span class="text-white">Abrir turma</span>
									</a>

									<a
										href={`/teacher/import?classId=${c.id}`}
										class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
									>
										<span>Importar notas</span>
									</a>

									<form method="POST" action="?/generateClassSnapshot">
										<input type="hidden" name="classId" value={c.id} />
										<button
											type="submit"
											class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
											disabled={c.studentsCount === 0 || c.skillsCount === 0}
										>
											<span>Gerar snapshot</span>
										</button>
									</form>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		<aside class="space-y-6 xl:sticky xl:top-6 xl:self-start">
			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" id="create-class">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Nova turma
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							Criar turma
						</h2>
					</div>

					<button
						type="button"
						class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
						onclick={() => (showCreateForm = !showCreateForm)}
					>
						<span>{showCreateForm ? 'Recolher' : 'Abrir'}</span>
					</button>
				</div>

				{#if showCreateForm}
					<form method="POST" action="?/createClass" class="mt-5 space-y-4">
						<div class="space-y-2">
							<label for="class-name" class="block text-sm font-bold text-slate-700">
								Nome da turma
							</label>

							<input
								id="class-name"
								name="name"
								placeholder="Ex: 2º Ano A"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
						</div>

						<div class="grid grid-cols-3 gap-3">
							<div class="space-y-2">
								<label for="score-min" class="block text-sm font-bold text-slate-700">
									Min
								</label>
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
								<label for="score-max" class="block text-sm font-bold text-slate-700">
									Max
								</label>
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

						<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
							Escala padrão: <strong class="text-slate-950">{newMin}–{newMax}</strong> • dec
							<strong class="text-slate-950">{newDecimals}</strong>
						</div>

						<button
							type="submit"
							class="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white transition hover:bg-slate-800"
						>
							<span class="text-white">Criar turma</span>
						</button>
					</form>
				{:else}
					<p class="mt-4 text-sm leading-7 text-slate-600">
						Abra este painel quando quiser criar uma nova turma com escala padrão definida.
					</p>
				{/if}
			</section>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">
					Próximos movimentos
				</p>
				<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
					Guia rápido
				</h2>

				<ul class="mt-4 space-y-3">
					{#each quickGuidance as item}
						<li class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
							{item}
						</li>
					{/each}
				</ul>

				{#if firstPriorityAction}
					<a
						href={firstPriorityAction.href}
						class="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
					>
						<span>Abrir prioridade atual</span>
					</a>
				{/if}
			</section>
		</aside>
	</div>
</div>