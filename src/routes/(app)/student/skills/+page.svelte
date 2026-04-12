<script lang="ts">
	import { resolve } from '$app/paths';

	import MetricCard from '$lib/components/shared/MetricCard.svelte';
	import StatusPill from '$lib/components/shared/StatusPill.svelte';

	type PortalStatus = 'pending-link' | 'ready';
	type TrendDirection = 'estável' | 'em melhora' | 'em atenção' | 'base insuficiente';
	type SubjectSituation = 'saudável' | 'em atenção' | 'base insuficiente';

	type SubjectCard = {
		id: string;
		name: string;
		code: string | null;
		currentAverage: number | null;
		normalizedPercent: number | null;
		trendDirection: TrendDirection;
		subjectStatus: SubjectSituation;
		publishedAssessments: number;
		latestPublication: {
			title: string | null;
			date: string | null;
		};
		description: string;
	};

	type HighlightedSubject = {
		id: string;
		name: string;
		code: string | null;
		currentAverage: number | null;
		normalizedPercent: number | null;
		trendDirection: TrendDirection;
		subjectStatus: SubjectSituation;
		description: string;
		latestPublication: {
			title: string | null;
			date: string | null;
		};
	};

	type Props = {
		data: {
			subjectsPortal: {
				status: PortalStatus;
				message: string;
			};
			student: {
				className: string | null;
			};
			bestSubject: HighlightedSubject | null;
			prioritySubject: HighlightedSubject | null;
			subjects: SubjectCard[];
			subjectsSummary: {
				totalSubjects: number;
				healthySubjects: number;
				attentionSubjects: number;
				insufficientBaseSubjects: number;
			};
		};
	};

	let { data }: Props = $props();

	let selectedStatus = $state<'all' | SubjectSituation>('all');
	let search = $state('');

	const filteredSubjects = $derived.by(() => {
		const query = search.trim().toLocaleLowerCase('pt-BR');

		return data.subjects.filter((subject) => {
			const matchesSearch =
				query.length === 0 ||
				subject.name.toLocaleLowerCase('pt-BR').includes(query) ||
				(subject.code ?? '').toLocaleLowerCase('pt-BR').includes(query);

			const matchesStatus = selectedStatus === 'all' || subject.subjectStatus === selectedStatus;

			return matchesSearch && matchesStatus;
		});
	});

	function formatDate(value: string | null) {
		if (!value) return 'Sem data';
		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return value;

		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(date);
	}

	function formatGrade(value: number | null) {
		if (typeof value !== 'number') return '—';

		return new Intl.NumberFormat('pt-BR', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}).format(value);
	}

	function formatPercent(value: number | null) {
		if (typeof value !== 'number') return '—';

		return `${new Intl.NumberFormat('pt-BR', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}).format(value)}%`;
	}

	function subjectTone(status: SubjectSituation) {
		if (status === 'saudável') return 'healthy';
		if (status === 'em atenção') return 'attention';
		return 'neutral';
	}

	function subjectLabel(status: SubjectSituation) {
		if (status === 'saudável') return 'Saudável';
		if (status === 'em atenção') return 'Em atenção';
		return 'Base insuficiente';
	}

	function trendTone(trend: TrendDirection) {
		if (trend === 'em melhora') return 'healthy';
		if (trend === 'em atenção') return 'attention';
		if (trend === 'estável') return 'context';
		return 'neutral';
	}

	function trendLabel(trend: TrendDirection) {
		if (trend === 'em melhora') return 'Em melhora';
		if (trend === 'em atenção') return 'Em atenção';
		if (trend === 'estável') return 'Estável';
		return 'Base insuficiente';
	}

	function subjectNarrative(subject: SubjectCard | HighlightedSubject) {
		const latestTitle = subject.latestPublication.title;
		const latestDate = subject.latestPublication.date
			? formatDate(subject.latestPublication.date)
			: null;

		if (subject.subjectStatus === 'base insuficiente') {
			return latestTitle
				? `Ainda não há base suficiente para leitura confiável. Última publicação: ${latestTitle} em ${latestDate}.`
				: 'Ainda não há base suficiente para leitura confiável desta matéria.';
		}

		if (subject.subjectStatus === 'saudável' && subject.trendDirection === 'em melhora') {
			return latestTitle
				? `Matéria saudável e em melhora. Última publicação: ${latestTitle} em ${latestDate}.`
				: 'Matéria saudável e em melhora.';
		}

		if (subject.subjectStatus === 'saudável' && subject.trendDirection === 'estável') {
			return latestTitle
				? `Matéria saudável e estável. Última publicação: ${latestTitle} em ${latestDate}.`
				: 'Matéria saudável e estável.';
		}

		if (subject.subjectStatus === 'em atenção' && subject.trendDirection === 'em atenção') {
			return latestTitle
				? `Matéria em atenção e com queda recente. Última publicação: ${latestTitle} em ${latestDate}.`
				: 'Matéria em atenção e com queda recente.';
		}

		if (subject.subjectStatus === 'em atenção') {
			return latestTitle
				? `Matéria em atenção no momento. Última publicação: ${latestTitle} em ${latestDate}.`
				: 'Matéria em atenção no momento.';
		}

		return latestTitle
			? `Última publicação: ${latestTitle} em ${latestDate}.`
			: 'Sem publicação recente suficiente para leitura.';
	}

	const primaryJourneyHref = resolve('/student/journey');
</script>

<svelte:head>
	<title>Class Insights - Matérias</title>
</svelte:head>

<div class="app-stack-lg">
	<section class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
		<div class="app-card-strong app-stack-md">
			<div class="app-header">
				<p class="app-eyebrow">Matérias</p>
				<h1 class="app-title">Como cada matéria está agora</h1>
				<p class="app-subtitle">
					Veja a nota atual, a tendência, a última publicação e a situação de cada matéria sem
					misturar conceitos no mesmo bloco.
				</p>
			</div>

			<div class="flex flex-wrap gap-3">
				{#if data.student.className}
					<StatusPill label={data.student.className} tone="context" />
				{/if}
				<StatusPill label={`${data.subjectsSummary.totalSubjects} matéria(s)`} tone="neutral" />
			</div>

			<div class="app-kpi-grid">
				<MetricCard
					label="Saudáveis"
					value={String(data.subjectsSummary.healthySubjects)}
					tone={data.subjectsSummary.healthySubjects > 0 ? 'healthy' : 'neutral'}
					valueTone={data.subjectsSummary.healthySubjects > 0 ? 'tone' : 'default'}
					compact={true}
				/>
				<MetricCard
					label="Em atenção"
					value={String(data.subjectsSummary.attentionSubjects)}
					tone={data.subjectsSummary.attentionSubjects > 0 ? 'attention' : 'neutral'}
					valueTone={data.subjectsSummary.attentionSubjects > 0 ? 'tone' : 'default'}
					compact={true}
				/>
				<MetricCard
					label="Base insuficiente"
					value={String(data.subjectsSummary.insufficientBaseSubjects)}
					tone={data.subjectsSummary.insufficientBaseSubjects > 0 ? 'neutral' : 'healthy'}
					valueTone="tone"
					compact={true}
				/>
			</div>
		</div>

		<section class="app-card app-stack-md">
			<div class="app-header">
				<p class="app-eyebrow">Leitura rápida</p>
				<h2 class="app-title">Resumo do momento</h2>
				<p class="app-subtitle">
					As matérias mais fortes e as que pedem revisão primeiro aparecem aqui para orientar o
					próximo clique.
				</p>
			</div>

			{#if data.bestSubject}
				<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p class="text-sm font-black text-slate-950">Ponto forte</p>
							<p class="mt-1 text-base font-black text-slate-950">{data.bestSubject.name}</p>
						</div>

						<StatusPill
							label={subjectLabel(data.bestSubject.subjectStatus)}
							tone={subjectTone(data.bestSubject.subjectStatus)}
							uppercase={true}
						/>
					</div>

					<p class="mt-3 text-sm leading-7 text-slate-600">
						{subjectNarrative(data.bestSubject)}
					</p>
				</div>
			{/if}

			{#if data.prioritySubject}
				<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p class="text-sm font-black text-slate-950">Onde revisar primeiro</p>
							<p class="mt-1 text-base font-black text-slate-950">{data.prioritySubject.name}</p>
						</div>

						<StatusPill
							label={subjectLabel(data.prioritySubject.subjectStatus)}
							tone={subjectTone(data.prioritySubject.subjectStatus)}
							uppercase={true}
						/>
					</div>

					<p class="mt-3 text-sm leading-7 text-slate-600">
						{subjectNarrative(data.prioritySubject)}
					</p>
				</div>
			{/if}
		</section>
	</section>

	{#if data.subjectsPortal.status !== 'ready'}
		<section class="app-empty-state">
			<p class="app-empty-state-title">Conclua um vínculo para liberar as matérias</p>
			<p class="app-empty-state-text">{data.subjectsPortal.message}</p>
			<div class="mt-4 flex flex-wrap justify-center gap-3">
				<a href={resolve('/student')} class="app-button">Voltar ao início</a>
			</div>
		</section>
	{:else}
		<section class="app-card app-stack-md">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div class="app-header">
					<p class="app-eyebrow">Filtro</p>
					<h2 class="app-title">Encontrar matéria</h2>
					<p class="app-subtitle">
						Filtre por nome ou por situação para focar no que merece mais atenção.
					</p>
				</div>
			</div>

			<div class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(220px,1fr)]">
				<div>
					<label for="subject-search" class="block text-sm font-black text-slate-900">Buscar</label>
					<input
						id="subject-search"
						bind:value={search}
						type="text"
						class="app-input mt-2"
						placeholder="Nome da matéria ou código"
					/>
				</div>

				<div>
					<label for="subject-status-filter" class="block text-sm font-black text-slate-900">
						Situação
					</label>
					<select id="subject-status-filter" bind:value={selectedStatus} class="app-select mt-2">
						<option value="all">Todas</option>
						<option value="saudável">Saudáveis</option>
						<option value="em atenção">Em atenção</option>
						<option value="base insuficiente">Base insuficiente</option>
					</select>
				</div>
			</div>
		</section>

		{#if filteredSubjects.length === 0}
			<section class="app-empty-state">
				<p class="app-empty-state-title">Nenhuma matéria encontrada</p>
				<p class="app-empty-state-text">
					Ajuste a busca ou o filtro para voltar a ver as matérias da sua turma.
				</p>
			</section>
		{:else}
			<section class="grid gap-4 xl:grid-cols-2">
				{#each filteredSubjects as subject (subject.id)}
					<article class="app-card-strong app-stack-md">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0">
								<h3 class="text-2xl font-black tracking-tight text-slate-950">
									{subject.name}
								</h3>
								<p class="mt-1 text-sm text-slate-600">
									{subject.code ?? 'Sem código'} · {subject.publishedAssessments} publicação(ões)
								</p>
							</div>

							<StatusPill
								label={subjectLabel(subject.subjectStatus)}
								tone={subjectTone(subject.subjectStatus)}
								uppercase={true}
							/>
						</div>

						<div class="grid gap-3 md:grid-cols-2">
							<MetricCard
								label="Nota atual"
								value={formatGrade(subject.currentAverage)}
								tone={subject.subjectStatus === 'base insuficiente' ? 'neutral' : 'context'}
								valueTone="tone"
								compact={true}
							/>

							<MetricCard
								label="Tendência"
								value={trendLabel(subject.trendDirection)}
								tone={trendTone(subject.trendDirection)}
								valueTone="tone"
								compact={true}
							/>
						</div>

						<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
								Última publicação
							</p>

							{#if subject.latestPublication.title}
								<p class="mt-2 text-base font-black text-slate-950">
									{subject.latestPublication.title}
								</p>
								<p class="mt-1 text-sm text-slate-600">
									{formatDate(subject.latestPublication.date)}
								</p>
							{:else}
								<p class="mt-2 text-sm leading-7 text-slate-600">
									Ainda não há publicação suficiente para montar uma referência recente.
								</p>
							{/if}
						</div>

						<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Situação</p>
							<p class="mt-2 text-sm leading-7 text-slate-600">
								{subjectNarrative(subject)}
							</p>
						</div>

						<div class="flex flex-wrap gap-3">
							<a href={primaryJourneyHref} class="app-button"> Ver evolução da matéria </a>
							<a href={resolve('/student')} class="app-button-secondary"> Voltar ao início </a>
						</div>
					</article>
				{/each}
			</section>
		{/if}
	{/if}
</div>
