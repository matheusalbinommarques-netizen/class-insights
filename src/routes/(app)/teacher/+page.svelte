<!-- eslint-disable svelte/no-navigation-without-resolve -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { formatPercentAsGrade, formatPtBrGrade } from '$lib/utils/format';
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

	const formState = $derived(($page.form ?? null) as ActionFeedback | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);
	const sortedActionQueue = $derived.by(() =>
		[...data.actionQueue].sort((a, b) => a.priority - b.priority)
	);
	const operationalQueue = $derived.by(() =>
		sortedActionQueue.filter((item) => item.signalType === 'operational')
	);
	const pedagogicalQueue = $derived.by(() =>
		sortedActionQueue.filter((item) => item.signalType === 'pedagogical')
	);
	const visibleClasses = $derived.by(() =>
		selectedFilter === 'all'
			? data.classes
			: data.classes.filter((item) => item.status === selectedFilter)
	);
	const classesWithoutSubjects = $derived.by(() =>
		data.classes.filter((item) => item.subjectsCount === 0)
	);
	const classesWithoutAssessments = $derived.by(() =>
		data.classes.filter(
			(item) => item.studentsCount > 0 && item.subjectsCount > 0 && item.assessmentsCount === 0
		)
	);

	const quickActions = [
		{ label: 'Criar turma', href: '#create-class', tone: 'primary' },
		{ label: 'Criar avaliacao', href: '/teacher/assessments', tone: 'secondary' },
		{ label: 'Abrir materias', href: '/teacher/subjects', tone: 'secondary' },
		{ label: 'Import legado', href: '/teacher/import', tone: 'muted' }
	] as const;

	const classFilters = $derived.by(
		(): Array<{ filter: ClassFilter; label: string; count: number }> => [
			{ filter: 'all', label: 'Todas', count: data.classes.length },
			{
				filter: 'critical',
				label: 'Criticas',
				count: data.classes.filter((item) => item.status === 'critical').length
			},
			{
				filter: 'attention',
				label: 'Atencao',
				count: data.classes.filter((item) => item.status === 'attention').length
			},
			{
				filter: 'setup',
				label: 'Setup',
				count: data.classes.filter((item) => item.status === 'setup').length
			},
			{
				filter: 'healthy',
				label: 'Saudaveis',
				count: data.classes.filter((item) => item.status === 'healthy').length
			}
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

	function formatCoverage(value: number) {
		return `${value}%`;
	}

	function formatGradeFromPercent(value: number | null) {
		return formatPercentAsGrade(value);
	}

	function formatGap(value: number | null) {
		if (typeof value !== 'number') return '--';
		const absolute = formatPtBrGrade(Math.abs(value) / 10);
		return `${value >= 0 ? '+' : '-'}${absolute}`;
	}

	function formatTrend(value: number | null) {
		if (typeof value !== 'number') return 'Sem comparacao anterior';
		const absolute = formatPtBrGrade(Math.abs(value) / 10);
		return `${value >= 0 ? '+' : '-'}${absolute} em relacao a avaliacao anterior`;
	}

	function statusLabel(status: TeacherDashboardClassCard['status']) {
		if (status === 'healthy') return 'Saudavel';
		if (status === 'attention') return 'Atencao';
		if (status === 'critical') return 'Critica';
		return 'Em configuracao';
	}

	function statusClass(status: TeacherDashboardClassCard['status']) {
		if (status === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (status === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		if (status === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		return 'border-sky-200 bg-sky-50 text-sky-700';
	}

	function prioritySurface(status: TeacherDashboardClassCard['status']) {
		if (status === 'critical') return 'border-red-200 bg-red-50/70';
		if (status === 'attention') return 'border-amber-200 bg-amber-50/70';
		if (status === 'setup') return 'border-sky-200 bg-sky-50/70';
		return 'border-slate-200 bg-white';
	}

	function filterButtonClass(filter: ClassFilter) {
		const active = selectedFilter === filter;
		if (!active)
			return 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900';
		if (filter === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (filter === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		if (filter === 'setup') return 'border-sky-200 bg-sky-50 text-sky-700';
		if (filter === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		return 'border-slate-300 bg-slate-100 text-slate-900';
	}

	function nextStepCopy(item: TeacherDashboardClassCard) {
		if (item.studentsCount === 0)
			return 'Adicione os primeiros alunos para esta turma entrar no fluxo.';
		if (item.subjectsCount === 0)
			return 'Vincule as materias antes de criar ou importar avaliacoes.';
		if (item.assessmentsCount === 0) return 'Crie a primeira avaliacao desta turma.';
		if (item.readyToPublishCount > 0)
			return `Voce tem ${item.readyToPublishCount} rascunho(s) pronto(s) para publicar.`;
		if (item.pendingResultsCount > 0)
			return `${item.pendingResultsCount} resultado(s) ainda faltam para fechar os rascunhos abertos.`;
		if (item.focusSubjects.length > 0)
			return `${item.focusSubjects[0].subjectName} e a materia que mais pede leitura agora.`;
		return 'Nenhum aluno abaixo da meta nesta turma no recorte publicado atual.';
	}

	function classPrimaryAction(item: TeacherDashboardClassCard) {
		if (item.readyToPublishCount > 0) {
			return { href: '/teacher/assessments', label: 'Abrir avaliacoes' };
		}
		return { href: `/teacher/${item.id}`, label: 'Abrir turma' };
	}

	function focusToneClass(tone: TeacherDashboardClassCard['focusSubjects'][number]['tone']) {
		if (tone === 'critical') return 'border-red-200 bg-red-50 text-red-700';
		if (tone === 'attention') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-emerald-200 bg-emerald-50 text-emerald-700';
	}

	function trendClass(value: number | null) {
		if (typeof value !== 'number') return 'text-slate-500';
		return value < 0 ? 'text-red-700' : 'text-emerald-700';
	}

	function riskLevelClass(level: TeacherRiskStudentCard['riskLevel']) {
		return level === 'high'
			? 'border-red-200 bg-red-50 text-red-700'
			: 'border-amber-200 bg-amber-50 text-amber-700';
	}

	function riskLevelLabel(level: TeacherRiskStudentCard['riskLevel']) {
		return level === 'high' ? 'Risco alto' : 'Risco moderado';
	}

	function actionButtonClass(tone: 'primary' | 'secondary' | 'muted') {
		if (tone === 'primary') return 'bg-slate-900 text-white hover:bg-slate-800';
		if (tone === 'secondary')
			return 'border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50';
		return 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white';
	}

	function confirmDelete(event: MouseEvent) {
		if (
			!confirm('Deletar esta turma? Isso remove alunos, materias vinculadas e dados operacionais.')
		) {
			event.preventDefault();
		}
	}
</script>

<svelte:head>
	<title>Class Insights - Professor</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
			<div class="max-w-3xl">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">Teacher cockpit</p>
				<h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
					O que exige acao agora, {data.summary.displayName}.
				</h1>
				<p class="mt-3 text-base leading-8 text-slate-600">{data.summary.message}</p>
				{#if sortedActionQueue[0]}
					<div class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
						<p class="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
							Proximo passo
						</p>
						<p class="mt-2 text-lg font-black text-slate-950">{sortedActionQueue[0].title}</p>
						<p class="mt-2 text-sm leading-7 text-slate-600">{sortedActionQueue[0].description}</p>
						<a
							href={sortedActionQueue[0].href}
							class="mt-4 inline-flex h-11 items-center justify-center rounded-2xl border border-amber-200 bg-white px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
							>{sortedActionQueue[0].ctaLabel}</a
						>
					</div>
				{/if}
			</div>

			<div class="grid gap-3 sm:grid-cols-2 xl:w-full xl:max-w-md">
				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Pendencias operacionais
					</p>
					<p class="mt-2 text-3xl font-black text-slate-950">{operationalQueue.length}</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						Rascunhos, cobertura e configuracao de turma.
					</p>
				</div>
				<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
					<p class="text-xs font-black uppercase tracking-widest text-amber-700">
						Leituras pedagogicas
					</p>
					<p class="mt-2 text-3xl font-black text-slate-950">{pedagogicalQueue.length}</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						Materias, alunos e quedas que pedem leitura.
					</p>
				</div>
				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Turmas sem materia
					</p>
					<p class="mt-2 text-3xl font-black text-slate-950">{classesWithoutSubjects.length}</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						Essas turmas ainda nao entram no fluxo formal.
					</p>
				</div>
				<div class="rounded-2xl border border-slate-200 bg-white p-4">
					<p class="text-xs font-black uppercase tracking-widest text-slate-500">
						Avaliacoes sem fechamento
					</p>
					<p class="mt-2 text-3xl font-black text-slate-950">
						{data.summary.totalDraftAssessments}
					</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						Parte delas ja pode virar publicacao agora.
					</p>
				</div>
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

	<section class="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
		<div class="space-y-6">
			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Pendencias operacionais
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							Feche o que destrava o resto
						</h2>
					</div>
					<p class="max-w-xl text-sm leading-7 text-slate-600">
						Rascunhos abertos, turmas sem materia e avaliacoes sem fechamento aparecem aqui
						primeiro.
					</p>
				</div>

				{#if operationalQueue.length === 0}
					<div
						class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<h3 class="text-lg font-black text-slate-950">Nenhuma pendencia operacional agora</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Suas turmas principais estao configuradas. O proximo passo natural e publicar ou criar
							nova avaliacao.
						</p>
					</div>
				{:else}
					<div class="mt-5 space-y-3">
						{#each operationalQueue as item (item.id)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
									<div class="min-w-0">
										<p class="text-base font-black text-slate-950">{item.title}</p>
										<p class="mt-1 text-sm leading-7 text-slate-600">{item.description}</p>
									</div>
									<a
										href={item.href}
										class="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
										>{item.ctaLabel}</a
									>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Leituras pedagogicas
						</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							O que mudou no desempenho
						</h2>
					</div>
					<p class="max-w-xl text-sm leading-7 text-slate-600">
						Aqui entram materias abaixo da meta, alunos em queda e gaps relevantes do recorte
						publicado.
					</p>
				</div>

				<div class="mt-5 grid gap-4 xl:grid-cols-3">
					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Materias abaixo da referencia
						</p>
						{#if data.longitudinalSubjects.length === 0}
							<p class="mt-3 text-sm leading-7 text-slate-600">
								Nenhuma leitura suficiente publicada ainda.
							</p>
						{:else}
							<div class="mt-3 space-y-3">
								{#each data.longitudinalSubjects.slice(0, 3) as subject (subject.subject_id)}
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-sm font-black text-slate-950">{subject.subject_name}</p>
										<p class="mt-1 text-sm leading-6 text-slate-600">
											Media publicada: {formatGradeFromPercent(subject.average_percent)} / 10
										</p>
										<p class="mt-1 text-xs text-slate-500">
											Tendencia: {subject.recent_trend === 'insufficient_data'
												? 'Dados insuficientes'
												: subject.recent_trend === 'declining'
													? 'Em queda'
													: subject.recent_trend === 'improving'
														? 'Em melhora'
														: 'Estavel'}
										</p>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Alunos em queda
						</p>
						{#if data.riskStudents.length === 0}
							<p class="mt-3 text-sm leading-7 text-slate-600">
								Nenhum aluno abaixo da meta no recorte atual.
							</p>
						{:else}
							<div class="mt-3 space-y-3">
								{#each data.riskStudents.slice(0, 3) as student (student.studentId)}
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<div class="flex items-center justify-between gap-3">
											<p class="text-sm font-black text-slate-950">{student.studentName}</p>
											<span
												class={`rounded-full border px-2 py-1 text-[11px] font-black uppercase tracking-widest ${riskLevelClass(student.riskLevel)}`}
												>{riskLevelLabel(student.riskLevel)}</span
											>
										</div>
										<p class="mt-1 text-sm leading-6 text-slate-600">
											{student.className} - media publicada: {formatGradeFromPercent(
												student.averagePercent
											)} / 10
										</p>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">
							Gaps relevantes
						</p>
						{#if data.studentComparisons.length === 0}
							<p class="mt-3 text-sm leading-7 text-slate-600">
								Tudo dentro do esperado em comparacao com a media das turmas.
							</p>
						{:else}
							<div class="mt-3 space-y-3">
								{#each data.studentComparisons.slice(0, 3) as item (item.studentId)}
									<div class="rounded-2xl border border-slate-200 bg-white p-3">
										<p class="text-sm font-black text-slate-950">{item.studentName}</p>
										<p class="mt-1 text-sm leading-6 text-slate-600">
											{item.className} - gap de {formatGap(item.gapPercent)} em relacao a turma
										</p>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</section>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p class="text-xs font-black uppercase tracking-widest text-slate-500">Turmas vivas</p>
						<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
							Cada turma mostra o proximo clique
						</h2>
						<p class="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
							Media publicada, cobertura, tendencia e proximo passo aparecem sempre com referencia
							clara.
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each classFilters as chip (chip.filter)}
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

				{#if data.classes.length === 0}
					<div
						class="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
					>
						<h3 class="text-2xl font-black tracking-tight text-slate-950">
							Sem turma por enquanto
						</h3>
						<p class="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
							Crie a primeira turma para ativar materias, avaliacoes e leitura pedagógica. O import
							legado fica como apoio, nao como fluxo principal.
						</p>
						<button
							type="button"
							class="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
							onclick={() => (showCreateForm = true)}>Criar primeira turma</button
						>
					</div>
				{:else if visibleClasses.length === 0}
					<div
						class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<h3 class="text-lg font-black text-slate-950">Nenhuma turma nesse filtro</h3>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Troque o filtro para ver outras turmas do workspace.
						</p>
					</div>
				{:else}
					<div class="mt-6 space-y-4">
						{#each visibleClasses as item (item.id)}
							{@const primaryAction = classPrimaryAction(item)}
							{@const classDetailsHref = `/teacher/${item.id}`}
							<article class={`rounded-3xl border p-5 ${prioritySurface(item.status)}`}>
								<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-3">
											<h3 class="text-2xl font-black tracking-tight text-slate-950">{item.name}</h3>
											<span
												class={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${statusClass(item.status)}`}
												>{statusLabel(item.status)}</span
											>
										</div>
										<p class="mt-2 text-sm leading-7 text-slate-600">
											Criada em {formatDate(item.created_at)} | Escala: {item.scaleLabel}
										</p>
									</div>
									<form method="POST" action="?/deleteClass">
										<input type="hidden" name="classId" value={item.id} />
										<button
											type="submit"
											class="inline-flex h-10 items-center justify-center rounded-2xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
											onclick={confirmDelete}>Excluir turma</button
										>
									</form>
								</div>

								<div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
									<p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
										Proximo passo
									</p>
									<p class="mt-2 text-sm font-semibold text-slate-900">{nextStepCopy(item)}</p>
								</div>

								<div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Media publicada
										</p>
										<p class="mt-2 text-2xl font-black text-slate-950">
											{formatGradeFromPercent(item.averagePercent)} / 10
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Cobertura publicada
										</p>
										<p class="mt-2 text-2xl font-black text-slate-950">
											{formatCoverage(item.publishedCoveragePercent)}
										</p>
										<p class="mt-1 text-xs text-slate-500">dos resultados esperados</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Tendencia
										</p>
										<p class={`mt-2 text-sm font-black ${trendClass(item.trendDelta)}`}>
											{formatTrend(item.trendDelta)}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Pendencias
										</p>
										<p class="mt-2 text-2xl font-black text-slate-950">
											{item.pendingResultsCount}
										</p>
										<p class="mt-1 text-xs text-slate-500">resultado(s) ainda faltam</p>
									</div>
								</div>

								<div class="mt-4 grid gap-3 md:grid-cols-3">
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Rascunhos abertos
										</p>
										<p class="mt-2 text-xl font-black text-slate-950">
											{item.draftAssessmentsCount}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Materias
										</p>
										<p class="mt-2 text-xl font-black text-slate-950">{item.subjectsCount}</p>
									</div>
									<div class="rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Alunos em risco
										</p>
										<p class="mt-2 text-xl font-black text-slate-950">{item.riskStudentsCount}</p>
									</div>
								</div>

								{#if item.focusSubjects.length > 0}
									<div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
										<p class="text-xs font-black uppercase tracking-widest text-slate-500">
											Materias que mais pedem atencao
										</p>
										<div class="mt-3 flex flex-wrap gap-2">
											{#each item.focusSubjects as subject (subject.subjectId)}
												<div class={`rounded-2xl border px-3 py-3 ${focusToneClass(subject.tone)}`}>
													<p class="text-sm font-black">{subject.subjectName}</p>
													<p class="mt-1 text-xs">
														Media: {formatGradeFromPercent(subject.averagePercent)} / 10
													</p>
													<p class="mt-1 text-xs">
														Gap vs turma: {formatGap(subject.gapVsClassAverage)}
													</p>
												</div>
											{/each}
										</div>
									</div>
								{:else}
									<div
										class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-7 text-slate-600"
									>
										Nenhuma materia em atencao nesta turma no recorte publicado atual.
									</div>
								{/if}

								<div class="mt-5 flex flex-wrap gap-3">
									<a
										href={primaryAction.href}
										class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
										>{primaryAction.label}</a
									>
									{#if primaryAction.href !== classDetailsHref}
										<a
											href={classDetailsHref}
											class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
											>Abrir turma</a
										>
									{/if}
									<a
										href={resolve('/teacher/import') + `?classId=${item.id}`}
										class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-white"
										>Import legado</a
									>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		<aside class="space-y-6 xl:sticky xl:top-6 xl:self-start">
			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">Acoes rapidas</p>
				<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
					Entre pelo fluxo principal
				</h2>
				<div class="mt-4 space-y-3">
					{#each quickActions as action (action.label)}
						<a
							href={action.href}
							class={`inline-flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-bold transition ${actionButtonClass(action.tone)}`}
							>{action.label}</a
						>
					{/each}
				</div>
				<p class="mt-4 text-sm leading-7 text-slate-600">
					Import legado segue como apoio. Nao deve competir com criar turma, abrir materia e fechar
					avaliacao.
				</p>
			</section>

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
						>{showCreateForm ? 'Recolher' : 'Abrir'}</button
					>
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
							Escala padrao: <strong class="text-slate-950">{newMin}-{newMax}</strong> com
							<strong class="text-slate-950">{newDecimals}</strong> decimal(is)
						</div>
						<button
							type="submit"
							class="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white transition hover:bg-slate-800"
							>Criar turma</button
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
					Estados de atencao
				</p>
				<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Resumo rapido</h2>
				<div class="mt-4 space-y-3 text-sm leading-7 text-slate-600">
					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
						{classesWithoutSubjects.length > 0
							? `${classesWithoutSubjects.length} turma(s) ainda sem materia vinculada.`
							: 'Nenhuma turma sem materia vinculada.'}
					</div>
					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
						{classesWithoutAssessments.length > 0
							? `${classesWithoutAssessments.length} turma(s) ainda sem avaliacao criada.`
							: 'Nenhuma turma sem avaliacao criada.'}
					</div>
					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
						{data.summary.totalPendingPublications > 0
							? `${data.summary.totalPendingPublications} publicacao(oes) pendente(s) de fechamento.`
							: 'Nenhuma publicacao pendente agora.'}
					</div>
					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
						{data.longitudinalSubjects.length > 0
							? `${data.longitudinalSubjects[0].subject_name} lidera a leitura pedagogica atual.`
							: 'Nenhuma materia em atencao no longitudinal agora.'}
					</div>
				</div>
			</section>

			<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-black uppercase tracking-widest text-slate-500">Quedas recentes</p>
				<h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">
					Onde vale olhar mais fundo
				</h2>
				{#if data.assessmentDrops.length === 0}
					<p class="mt-4 text-sm leading-7 text-slate-600">
						Nenhuma queda relevante entre as duas publicacoes mais recentes por materia.
					</p>
				{:else}
					<div class="mt-4 space-y-3">
						{#each data.assessmentDrops.slice(0, 3) as item (item.latestAssessmentId)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p class="text-base font-black text-slate-950">{item.subjectName}</p>
								<p class="mt-1 text-sm leading-6 text-slate-600">{item.className}</p>
								<p class="mt-3 text-sm font-semibold text-red-700">
									Queda de {formatGap(item.dropPercent)} entre {formatDate(
										item.previousAssessmentDate
									)} e {formatDate(item.latestAssessmentDate)}
								</p>
								<a
									href={`/teacher/assessments/${item.latestAssessmentId}`}
									class="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
									>Abrir avaliacao</a
								>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</aside>
	</section>
</div>
