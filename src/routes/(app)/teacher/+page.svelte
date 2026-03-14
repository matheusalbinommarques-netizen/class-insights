<!-- eslint-disable svelte/no-navigation-without-resolve -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import type { SubjectLongitudinalSummary } from '$lib/types/academic';
	import type {
		TeacherActionQueueItem,
		TeacherAssessmentDropCard,
		TeacherDashboardClassCard,
		TeacherDashboardSummary,
		TeacherRiskStudentCard,
		TeacherStudentComparisonCard
	} from '$lib/types/teacher';

	type ActionFeedback = {
		action?: 'createClass' | 'deleteClass' | 'generateClassSnapshot';
		message?: string;
		success?: boolean;
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
			classes: TeacherDashboardClassCard[];
			actionQueue: TeacherActionQueueItem[];
			longitudinalSubjects: SubjectLongitudinalSummary[];
			riskStudents: TeacherRiskStudentCard[];
			studentComparisons: TeacherStudentComparisonCard[];
			assessmentDrops: TeacherAssessmentDropCard[];
			summary: TeacherDashboardSummary;
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
	const operationalQueue = $derived.by(() =>
		sortedActionQueue.filter((item) => item.signalType === 'operational')
	);
	const pedagogicalQueue = $derived.by(() =>
		sortedActionQueue.filter((item) => item.signalType === 'pedagogical')
	);
	const firstPriorityAction = $derived.by(() => sortedActionQueue[0] ?? null);

	const filterChips = $derived.by((): FilterChip[] => [
		{ filter: 'all', label: 'Todas', count: data.classes.length },
		{
			filter: 'critical',
			label: 'Criticas',
			count: data.classes.filter((c) => c.status === 'critical').length
		},
		{
			filter: 'attention',
			label: 'Atencao',
			count: data.classes.filter((c) => c.status === 'attention').length
		},
		{
			filter: 'setup',
			label: 'Setup',
			count: data.classes.filter((c) => c.status === 'setup').length
		},
		{
			filter: 'healthy',
			label: 'Saudaveis',
			count: data.classes.filter((c) => c.status === 'healthy').length
		}
	]);

	const visibleClasses = $derived.by(() =>
		selectedFilter === 'all'
			? data.classes
			: data.classes.filter((classCard) => classCard.status === selectedFilter)
	);

	const topStats = $derived.by((): TopStatItem[] => [
		{
			label: 'Turmas ativas',
			value: data.summary.totalClasses,
			foot: 'Portfolio atual',
			tone: 'neutral'
		},
		{
			label: 'Turmas em risco',
			value: data.summary.classesAtRisk,
			foot: 'Pedem atencao',
			tone: 'warn'
		},
		{
			label: 'Rascunhos',
			value: data.summary.totalDraftAssessments,
			foot: 'Ainda em operacao',
			tone: 'danger'
		},
		{
			label: 'Publicacoes pendentes',
			value: data.summary.totalPendingPublications,
			foot: 'Prontas para fechar',
			tone: 'neutral'
		}
	]);

	const quickGuidance = $derived.by(() =>
		data.summary.totalClasses === 0
			? [
					'Crie sua primeira turma',
					'Vincule materias e cadastre alunos',
					'Abra avaliacoes ou use importacao quando fizer sentido'
				]
			: [
					'Priorize turmas sem materias ou sem avaliacoes',
					'Feche rascunhos que ja podem virar publicacao',
					'Use importacao quando ela realmente acelerar a operacao'
				]
	);

	function formatDate(value: string | null) {
		if (!value) return 'Nunca';
		const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return 'Data indisponivel';

		const options = value.includes('T')
			? ({ dateStyle: 'medium', timeStyle: 'short' } as const)
			: ({ dateStyle: 'medium' } as const);
		return new Intl.DateTimeFormat('pt-BR', options).format(date);
	}

	function formatScore(value: number | null) {
		if (typeof value !== 'number') return '--';
		return (value / 10).toFixed(1);
	}

	function formatDelta(value: number | null) {
		if (typeof value !== 'number') return 'Sem baseline';
		return `${value >= 0 ? '+' : ''}${(value / 10).toFixed(1)} pts`;
	}

	function statusLabel(status: TeacherDashboardClassCard['status']) {
		if (status === 'healthy') return 'Saudavel';
		if (status === 'attention') return 'Atencao';
		if (status === 'critical') return 'Critica';
		return 'Configuracao';
	}

	function statusBadgeClass(status: TeacherDashboardClassCard['status']) {
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
		if (!isActive)
			return 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900';
		if (filter === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (filter === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		if (filter === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (filter === 'setup') return 'border-sky-200 bg-sky-50 text-sky-700';
		return 'border-slate-300 bg-slate-100 text-slate-900';
	}

	function criticalHint(classCard: TeacherDashboardClassCard) {
		if (classCard.studentsCount === 0) return 'Turma criada, mas ainda sem alunos.';
		if (classCard.subjectsCount === 0) return 'Turma sem materias vinculadas.';
		if (classCard.assessmentsCount === 0) return 'Turma pronta para ganhar a primeira avaliacao.';
		if (classCard.pendingResultsCount > 0)
			return `${classCard.pendingResultsCount} resultado(s) ainda faltam nos rascunhos abertos.`;
		if (classCard.riskStudentsCount > 0)
			return `${classCard.riskStudentsCount} aluno(s) aparecem em risco nas publicacoes atuais.`;
		return 'Turma operacional sem alertas criticos neste momento.';
	}

	function coverageBarClass(coverage: number) {
		if (coverage < 50) return 'bg-red-500';
		if (coverage < 85) return 'bg-amber-500';
		return 'bg-emerald-500';
	}

	function longitudinalTrendLabel(trend: SubjectLongitudinalSummary['recent_trend']) {
		if (trend === 'improving') return 'Melhora';
		if (trend === 'declining') return 'Queda';
		if (trend === 'stable') return 'Estavel';
		return 'Dados insuficientes';
	}

	function longitudinalTrendClass(trend: SubjectLongitudinalSummary['recent_trend']) {
		if (trend === 'improving') return 'text-emerald-700';
		if (trend === 'declining') return 'text-red-700';
		if (trend === 'stable') return 'text-slate-700';
		return 'text-slate-500';
	}

	function riskLevelClass(level: TeacherRiskStudentCard['riskLevel']) {
		return level === 'high'
			? 'border-red-200 bg-red-50 text-red-700'
			: 'border-amber-200 bg-amber-50 text-amber-700';
	}

	function riskLevelLabel(level: TeacherRiskStudentCard['riskLevel']) {
		return level === 'high' ? 'Risco alto' : 'Risco moderado';
	}

	function formatGap(value: number) {
		return `${value >= 0 ? '+' : ''}${(value / 10).toFixed(1)}`;
	}

	function focusSubjectToneClass(tone: TeacherDashboardClassCard['focusSubjects'][number]['tone']) {
		if (tone === 'critical') return 'border-red-200 bg-red-50';
		if (tone === 'attention') return 'border-amber-200 bg-amber-50';
		return 'border-emerald-200 bg-emerald-50';
	}

	function focusSubjectToneText(tone: TeacherDashboardClassCard['focusSubjects'][number]['tone']) {
		if (tone === 'critical') return 'text-red-700';
		if (tone === 'attention') return 'text-amber-700';
		return 'text-emerald-700';
	}

	function confirmDelete(event: MouseEvent) {
		if (
			!confirm('Deletar esta turma? Isso remove alunos, materias vinculadas e dados operacionais.')
		) {
			event.preventDefault();
		}
	}

	function goToImportForClass(classId: string) {
		window.location.href = `${resolve('/teacher/import')}?classId=${classId}`;
	}
</script>

<svelte:head>
	<title>Teacher Dashboard � Class Insights</title>
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
				<p class="mt-3 text-base leading-8 text-slate-600">{data.summary.message}</p>

				<div class="mt-5 flex flex-wrap gap-3">
					<button
						type="button"
						class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
						onclick={() => (showCreateForm = !showCreateForm)}
					>
						<span>{showCreateForm ? 'Ocultar nova turma' : 'Criar nova turma'}</span>
					</button>

					<a
						href={resolve('/teacher/subjects')}
						class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
					>
						<span>Abrir materias</span>
					</a>

					<a
						href={resolve('/teacher/import')}
						class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
					>
						<span>Importar notas</span>
					</a>

					<a
						href={resolve('/teacher/assessments')}
						class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
					>
						<span>Abrir avaliacoes</span>
					</a>

					{#if firstPriorityAction}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a
							href={firstPriorityAction.href}
							class="inline-flex h-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-5 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
						>
							<span>Ver turma prioritaria</span>
						</a>
					{/if}
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2 xl:w-full xl:max-w-sm">
				{#each topStats as stat (stat.label)}
					<div class={`rounded-2xl border p-4 ${statCardTone(stat.tone)}`}>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
						<p class="mt-2 text-3xl font-black text-slate-950">{stat.value}</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">{stat.foot}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	{#if formMessage}
		<div
			class={`rounded-2xl border px-4 py-3 text-sm font-semibold ${formSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}
		>
			{formMessage}
		</div>
	{/if}

	{#if data.error}
		<div
			class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
		>
			{data.error}
		</div>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[1.65fr_0.85fr]">
		<div class="space-y-6">
			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Decisao guiada
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							Operar agora e ler depois
						</h2>
					</div>
					<p class="max-w-xl text-sm leading-7 text-slate-600">
						O dashboard agora separa gargalos operacionais de sinais pedagogicos para o professor
						saber se precisa fechar processo ou abrir uma leitura individual.
					</p>
				</div>

				{#if sortedActionQueue.length === 0}
					<div
						class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<h3 class="text-lg font-black text-slate-950">Nenhuma pendencia urgente</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Suas turmas nao tem alertas prioritarios neste momento. Voce pode seguir com
							importacoes, novas avaliacoes ou criacao de novas turmas.
						</p>
					</div>
				{:else}
					<div class="mt-5 grid gap-4 xl:grid-cols-2">
						<div class="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-xs font-black uppercase tracking-widest text-slate-500">
										Operacional
									</p>
									<h3 class="mt-1 text-lg font-black text-slate-950">Fechar processo</h3>
								</div>
								<span
									class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-sky-700"
								>
									{operationalQueue.length} item(ns)
								</span>
							</div>

							{#if operationalQueue.length === 0}
								<p class="text-sm leading-7 text-slate-600">
									Sem gargalo operacional urgente no momento.
								</p>
							{:else}
								{#each operationalQueue as item (item.href)}
									<article
										class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
									>
										<div class="min-w-0">
											<p class="text-base font-black text-slate-950">{item.title}</p>
											<p class="mt-1 text-sm leading-7 text-slate-600">{item.description}</p>
										</div>
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
										<a
											href={item.href}
											class="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
										>
											<span>{item.ctaLabel}</span>
										</a>
									</article>
								{/each}
							{/if}
						</div>

						<div class="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-xs font-black uppercase tracking-widest text-amber-700">
										Pedagogico
									</p>
									<h3 class="mt-1 text-lg font-black text-slate-950">Ler e decidir</h3>
								</div>
								<span
									class="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-700"
								>
									{pedagogicalQueue.length} item(ns)
								</span>
							</div>

							{#if pedagogicalQueue.length === 0}
								<p class="text-sm leading-7 text-slate-600">
									Sem alerta pedagogico prioritario no recorte atual.
								</p>
							{:else}
								{#each pedagogicalQueue as item (item.href)}
									<article
										class="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
									>
										<div class="min-w-0">
											<p class="text-base font-black text-slate-950">{item.title}</p>
											<p class="mt-1 text-sm leading-7 text-slate-600">{item.description}</p>
										</div>
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
										<a
											href={item.href}
											class="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
										>
											<span>{item.ctaLabel}</span>
										</a>
									</article>
								{/each}
							{/if}
						</div>
					</div>
				{/if}
			</section>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Longitudinal publicado
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							Materias que mais pedem leitura agora
						</h2>
					</div>
					<p class="max-w-xl text-sm leading-7 text-slate-600">
						Este recorte usa apenas avaliacoes publicadas e resume media, tendencia e recencia por
						materia no workspace.
					</p>
				</div>

				{#if data.longitudinalSubjects.length === 0}
					<div
						class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<h3 class="text-lg font-black text-slate-950">Sem serie publicada suficiente</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Publique mais avaliacoes para o dashboard comparar materias e destacar sinais
							longitudinalmente.
						</p>
					</div>
				{:else}
					<div class="mt-5 grid gap-3 lg:grid-cols-2">
						{#each data.longitudinalSubjects as subject (subject.subject_id)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex items-start justify-between gap-3">
									<div>
										<p class="text-lg font-black text-slate-950">{subject.subject_name}</p>
										<p class="mt-1 text-sm leading-6 text-slate-600">
											{subject.assessments_count} avaliacao(oes) publicada(s)
										</p>
									</div>
									<p class="text-2xl font-black text-slate-950">
										{formatScore(subject.average_percent)}
									</p>
								</div>

								<div class="mt-4 grid gap-3 sm:grid-cols-2">
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Tendencia recente
										</p>
										<p
											class={`mt-2 text-sm font-black ${longitudinalTrendClass(subject.recent_trend)}`}
										>
											{longitudinalTrendLabel(subject.recent_trend)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Ultima avaliacao
										</p>
										<p class="mt-2 text-sm font-black text-slate-950">
											{formatDate(subject.latest_assessment_date)}
										</p>
									</div>
								</div>
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
							Turmas vivas, nao so cadastradas
						</h2>
						<p class="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
							Cobertura dos rascunhos, publicacoes, risco e tendencia agora nascem do modelo
							academico novo.
						</p>
					</div>

					<div class="flex flex-wrap gap-2">
						{#each filterChips as chip (chip.filter)}
							<button
								type="button"
								class={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition ${filterButtonClass(chip.filter)}`}
								onclick={() => (selectedFilter = chip.filter)}
							>
								<span>{chip.label}</span>
								<span class="rounded-full bg-white/80 px-2 py-0.5 text-xs font-black"
									>{chip.count}</span
								>
							</button>
						{/each}
					</div>
				</div>

				{#if !hasClasses}
					<div
						class="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
					>
						<div
							class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-xl font-black text-white shadow-sm"
						>
							CI
						</div>
						<h3 class="mt-4 text-2xl font-black tracking-tight text-slate-950">
							Pronto para criar a primeira turma?
						</h3>
						<p class="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
							Comece pelo fluxo essencial: turma, materias, alunos, avaliacoes e publicacao.
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
					<div
						class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<h3 class="text-lg font-black text-slate-950">Nenhuma turma nesse filtro</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Troque o filtro para visualizar outras turmas do workspace.
						</p>
					</div>
				{:else}
					<div class="mt-6 grid gap-4">
						{#each visibleClasses as c (c.id)}
							<article class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
								<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-3">
											<h3 class="text-2xl font-black tracking-tight text-slate-950">{c.name}</h3>
											<span
												class={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${statusBadgeClass(c.status)}`}
												>{statusLabel(c.status)}</span
											>
										</div>
										<p class="mt-2 text-sm leading-7 text-slate-600">
											Criada em {formatDate(c.created_at)} � {c.scaleLabel}
										</p>
									</div>

									<details class="relative">
										<summary
											class="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
											>...</summary
										>
										<div
											class="absolute right-0 top-12 z-10 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg"
										>
											<form method="POST" action="?/deleteClass">
												<input type="hidden" name="classId" value={c.id} />
												<button
													type="submit"
													class="flex h-11 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-700 transition hover:bg-red-100"
													onclick={confirmDelete}>Excluir turma</button
												>
											</form>
										</div>
									</details>
								</div>

								<div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
									<p class="text-sm font-semibold text-slate-900">{criticalHint(c)}</p>
								</div>

								<div class="mt-4 grid gap-4 lg:grid-cols-2">
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<div class="flex items-center justify-between gap-3">
											<p class="text-xs font-black uppercase tracking-widest text-slate-500">
												Cobertura dos rascunhos
											</p>
											<p class={`text-sm font-black ${coverageClass(c.draftCoveragePercent)}`}>
												{c.draftCoveragePercent}%
											</p>
										</div>
										<div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
											<div
												class={`h-full rounded-full ${coverageBarClass(c.draftCoveragePercent)}`}
												style={`width: ${Math.max(0, Math.min(100, c.draftCoveragePercent))}%`}
											></div>
										</div>
										<p class="mt-3 text-sm leading-6 text-slate-600">
											{c.filledResultsCount} de {c.totalExpectedResults} resultados esperados ja foram
											salvos.
										</p>
									</div>

									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<div class="flex items-center justify-between gap-3">
											<p class="text-xs font-black uppercase tracking-widest text-slate-500">
												Cobertura publicada
											</p>
											<p class={`text-sm font-black ${coverageClass(c.publishedCoveragePercent)}`}>
												{c.publishedCoveragePercent}%
											</p>
										</div>
										<div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
											<div
												class={`h-full rounded-full ${coverageBarClass(c.publishedCoveragePercent)}`}
												style={`width: ${Math.max(0, Math.min(100, c.publishedCoveragePercent))}%`}
											></div>
										</div>
										<p class="mt-3 text-sm leading-6 text-slate-600">
											Leitura oficial do aluno e do longitudinal sai apenas do que ja foi publicado.
										</p>
									</div>
								</div>

								<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Media publicada
										</p>
										<p class="mt-2 text-2xl font-black text-slate-950">
											{formatScore(c.averagePercent)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">Risco</p>
										<p class="mt-2 text-2xl font-black text-slate-950">{c.riskStudentsCount}</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Ultima publicacao
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{formatDate(c.latestPublicationDate)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Tendencia
										</p>
										<p class={`mt-2 text-lg font-black ${deltaClass(c.trendDelta)}`}>
											{formatDelta(c.trendDelta)}
										</p>
									</div>
								</div>

								<div class="mt-3 grid gap-3 sm:grid-cols-3">
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Alunos
										</p>
										<p class="mt-2 text-xl font-black text-slate-950">{c.studentsCount}</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Materias
										</p>
										<p class="mt-2 text-xl font-black text-slate-950">{c.subjectsCount}</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Pendencias
										</p>
										<p class="mt-2 text-xl font-black text-slate-950">{c.pendingResultsCount}</p>
									</div>
								</div>

								{#if c.focusSubjects.length > 0}
									<div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Materias pedindo mais atencao
										</p>
										<div class="mt-3 flex flex-wrap gap-2">
											{#each c.focusSubjects as subject (subject.subjectId)}
												<div
													class={`rounded-2xl border px-3 py-3 ${focusSubjectToneClass(subject.tone)}`}
												>
													<div class="flex items-start justify-between gap-3">
														<div class="min-w-0">
															<p class="text-sm font-black text-slate-950">{subject.subjectName}</p>
															<p class="mt-1 text-xs leading-5 text-slate-600">
																{subject.assessmentsCount} publicacao(oes)
															</p>
														</div>
														<p class={`text-sm font-black ${focusSubjectToneText(subject.tone)}`}>
															{formatScore(subject.averagePercent)}
														</p>
													</div>
													<p class="mt-2 text-xs leading-5 text-slate-600">
														Gap contra media da turma:
														<strong class={focusSubjectToneText(subject.tone)}>
															{subject.gapVsClassAverage === null
																? '--'
																: formatGap(subject.gapVsClassAverage)}
														</strong>
													</p>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<div class="mt-5 flex flex-wrap gap-3">
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
									<a
										href={`/teacher/${c.id}`}
										class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
										><span class="text-white">Abrir turma</span></a
									>
									<button
										type="button"
										class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
										onclick={() => goToImportForClass(c.id)}
									>
										<span>Importar notas</span>
									</button>
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
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">Nova turma</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Criar turma</h2>
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
							<label for="class-name" class="block text-sm font-bold text-slate-700"
								>Nome da turma</label
							>
							<input
								id="class-name"
								name="name"
								placeholder="Ex: 2o Ano A"
								class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
							/>
						</div>

						<div class="grid grid-cols-3 gap-3">
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
								<label for="score-decimals" class="block text-sm font-bold text-slate-700"
									>Decimais</label
								>
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
							Escala padrao: <strong class="text-slate-950">{newMin}-{newMax}</strong> � dec
							<strong class="text-slate-950">{newDecimals}</strong>
						</div>
						<button
							type="submit"
							class="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white transition hover:bg-slate-800"
							><span class="text-white">Criar turma</span></button
						>
					</form>
				{:else}
					<p class="mt-4 text-sm leading-7 text-slate-600">
						Abra este painel quando quiser criar uma nova turma com escala padrao definida.
					</p>
				{/if}
			</section>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">
					Proximos movimentos
				</p>
				<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Guia rapido</h2>

				<ul class="mt-4 space-y-3">
					{#each quickGuidance as item (item)}
						<li
							class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700"
						>
							{item}
						</li>
					{/each}
				</ul>

				{#if firstPriorityAction}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a
						href={firstPriorityAction.href}
						class="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
						><span>Abrir prioridade atual</span></a
					>
				{/if}
			</section>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">Ranking e risco</p>
				<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
					Alunos pedindo intervencao
				</h2>

				{#if data.riskStudents.length === 0}
					<p class="mt-4 text-sm leading-7 text-slate-600">
						Ainda nao ha alunos abaixo de 60% na leitura publicada atual do workspace.
					</p>
				{:else}
					<div class="mt-4 space-y-3">
						{#each data.riskStudents as student (student.studentId)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<p class="text-base font-black text-slate-950">{student.studentName}</p>
										<p class="mt-1 text-sm leading-6 text-slate-600">{student.className}</p>
									</div>
									<span
										class={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${riskLevelClass(student.riskLevel)}`}
									>
										{riskLevelLabel(student.riskLevel)}
									</span>
								</div>

								<div class="mt-4 grid grid-cols-2 gap-3">
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Media publicada
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{formatScore(student.averagePercent)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Amostra
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{student.publishedAssessmentsCount} avaliacao(oes)
										</p>
									</div>
								</div>

								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a
									href={`/teacher/students/${student.studentId}`}
									class="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
								>
									Abrir perfil do aluno
								</a>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">
					Comparativo aluno x turma
				</p>
				<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
					Maiores gaps abaixo da media
				</h2>

				{#if data.studentComparisons.length === 0}
					<p class="mt-4 text-sm leading-7 text-slate-600">
						Ainda nao ha gaps relevantes abaixo da media da turma na leitura publicada atual.
					</p>
				{:else}
					<div class="mt-4 space-y-3">
						{#each data.studentComparisons as item (item.studentId)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<p class="text-base font-black text-slate-950">{item.studentName}</p>
										<p class="mt-1 text-sm leading-6 text-slate-600">{item.className}</p>
									</div>
									<span
										class="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-red-700"
									>
										Gap {formatGap(item.gapPercent)}
									</span>
								</div>

								<div class="mt-4 grid grid-cols-3 gap-3">
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">Aluno</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{formatScore(item.studentAveragePercent)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">Turma</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{formatScore(item.classAveragePercent)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Amostra
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{item.publishedAssessmentsCount} avaliacao(oes)
										</p>
									</div>
								</div>

								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a
									href={`/teacher/students/${item.studentId}`}
									class="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
								>
									Abrir perfil do aluno
								</a>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">
					Queda entre avaliacoes
				</p>
				<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
					Materias com pior recuo recente
				</h2>

				{#if data.assessmentDrops.length === 0}
					<p class="mt-4 text-sm leading-7 text-slate-600">
						Ainda nao ha quedas relevantes entre as duas publicacoes mais recentes por materia.
					</p>
				{:else}
					<div class="mt-4 space-y-3">
						{#each data.assessmentDrops as item (`${item.classId}-${item.subjectName}-${item.latestAssessmentDate}`)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<p class="text-base font-black text-slate-950">{item.subjectName}</p>
										<p class="mt-1 text-sm leading-6 text-slate-600">{item.className}</p>
									</div>
									<span
										class="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-red-700"
									>
										{formatDelta(item.dropPercent)}
									</span>
								</div>

								<div class="mt-4 grid grid-cols-3 gap-3">
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Penultima
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{formatScore(item.previousAveragePercent)}
										</p>
										<p class="mt-1 text-xs text-slate-500">
											{formatDate(item.previousAssessmentDate)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Ultima
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{formatScore(item.latestAveragePercent)}
										</p>
										<p class="mt-1 text-xs text-slate-500">
											{formatDate(item.latestAssessmentDate)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Amostra
										</p>
										<p class="mt-2 text-lg font-black text-slate-950">
											{item.sampleSize} resultado(s)
										</p>
									</div>
								</div>

								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a
									href={`/teacher/${item.classId}`}
									class="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
								>
									Abrir turma
								</a>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</aside>
	</div>
</div>
