<script lang="ts">
	import { resolve } from '$app/paths';

	import MetricCard from '$lib/components/shared/MetricCard.svelte';
	import StatusPill from '$lib/components/shared/StatusPill.svelte';

	type PortalStatus = 'pending-link' | 'ready';
	type TrendDirection = 'estável' | 'em melhora' | 'em atenção' | 'base insuficiente';
	type EventDirection = 'up' | 'down' | 'flat' | 'insufficient_data';

	type SubjectOption = {
		id: string;
		name: string;
		code: string | null;
		currentAverage: number | null;
		normalizedPercent: number | null;
		trendDirection: TrendDirection;
		publishedAssessments: number;
		latestAssessmentTitle: string | null;
		latestAssessmentDate: string | null;
	};

	type TimelineEvent = {
		assessmentId: string;
		assessmentTitle: string;
		assessmentDate: string;
		subjectId: string;
		subjectName: string;
		rawScore: number | null;
		normalizedPercent: number | null;
		previousEvent: {
			assessmentId: string;
			assessmentTitle: string;
			assessmentDate: string;
			subjectId: string;
			subjectName: string;
			normalizedPercent: number | null;
		} | null;
		previousSubjectEvent: {
			assessmentId: string;
			assessmentTitle: string;
			assessmentDate: string;
			normalizedPercent: number | null;
		} | null;
		runningAverageBefore: number | null;
		runningAverageAfter: number | null;
		impactOnAverage: number | null;
		changeFromPreviousEvent: number | null;
		changeFromPreviousSubjectEvent: number | null;
		eventDirection: EventDirection;
		trendDirection: TrendDirection;
		isTurningPoint: boolean;
		turningPointLabel: string | null;
		comparisonLabel: string;
		impactLabel: string;
	};

	type Props = {
		data: {
			journeyPortal: {
				status: PortalStatus;
				message: string;
			};
			student: {
				className: string | null;
			};
			journeySummary: {
				latestEventTrend: TrendDirection;
			};
			subjectOptions: SubjectOption[];
			timelineEvents: TimelineEvent[];
		};
	};

	let { data }: Props = $props();

	let selectedSubjectId = $state<'all' | string>('all');

	const visibleEvents = $derived.by(() => {
		if (selectedSubjectId === 'all') return data.timelineEvents;
		return data.timelineEvents.filter((event) => event.subjectId === selectedSubjectId);
	});

	const selectedSubject = $derived.by(() => {
		if (selectedSubjectId === 'all') return null;
		return data.subjectOptions.find((subject) => subject.id === selectedSubjectId) ?? null;
	});

	const visibleTurningPoints = $derived(visibleEvents.filter((event) => event.isTurningPoint));
	const latestVisibleEvent = $derived(visibleEvents[0] ?? null);

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

	function formatSignedPercent(value: number | null) {
		if (typeof value !== 'number') return '—';

		const sign = value > 0 ? '+' : '';
		return `${sign}${new Intl.NumberFormat('pt-BR', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}).format(value)}%`;
	}

	function trendTone(trend: TrendDirection) {
		if (trend === 'em melhora') return 'healthy';
		if (trend === 'em atenção') return 'attention';
		if (trend === 'estável') return 'context';
		return 'neutral';
	}

	function trendTitle(trend: TrendDirection) {
		if (trend === 'em melhora') return 'Você está em melhora';
		if (trend === 'em atenção') return 'Você está em queda';
		if (trend === 'estável') return 'Você está estável';
		return 'Base insuficiente';
	}

	function trendDescription(trend: TrendDirection) {
		if (trend === 'em melhora') {
			return 'Os eventos recentes mostram avanço em relação ao histórico mais próximo.';
		}
		if (trend === 'em atenção') {
			return 'Os eventos recentes indicam queda e pedem revisão mais cuidadosa.';
		}
		if (trend === 'estável') {
			return 'Seu histórico recente está consistente, sem mudança brusca de direção.';
		}
		return 'Ainda não há base publicada suficiente para uma leitura longitudinal confiável.';
	}

	function eventTone(direction: EventDirection) {
		if (direction === 'up') return 'healthy';
		if (direction === 'down') return 'attention';
		if (direction === 'flat') return 'context';
		return 'neutral';
	}

	function eventDirectionLabel(direction: EventDirection) {
		if (direction === 'up') return 'Subiu';
		if (direction === 'down') return 'Caiu';
		if (direction === 'flat') return 'Estável';
		return 'Sem base';
	}

	function subjectTrendLabel(trend: TrendDirection) {
		if (trend === 'em melhora') return 'Em melhora';
		if (trend === 'em atenção') return 'Em atenção';
		if (trend === 'estável') return 'Estável';
		return 'Base insuficiente';
	}

	const latestImpactLabel = $derived.by(() => {
		const impact = latestVisibleEvent?.impactOnAverage ?? null;

		if (typeof impact !== 'number') return 'Sem base suficiente';
		if (impact > 0) return `+${formatGrade(impact)} p.p.`;
		if (impact < 0) return `-${formatGrade(Math.abs(impact))} p.p.`;
		return 'Sem alteração relevante';
	});
</script>

<svelte:head>
	<title>Class Insights - Trajetória</title>
</svelte:head>

<div class="app-stack-lg">
	<section class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
		<div class="app-card-strong app-stack-md">
			<div class="app-header">
				<p class="app-eyebrow">Trajetória</p>
				<h1 class="app-title">Leitura longitudinal do seu progresso</h1>
				<p class="app-subtitle">
					Veja como os eventos mais recentes mudaram sua trajetória e onde houve virada de
					tendência.
				</p>
			</div>

			<div class="flex flex-wrap gap-3">
				<StatusPill
					label={trendTitle(
						selectedSubject?.trendDirection ?? data.journeySummary.latestEventTrend
					)}
					tone={trendTone(selectedSubject?.trendDirection ?? data.journeySummary.latestEventTrend)}
				/>
				{#if data.student.className}
					<StatusPill label={data.student.className} tone="context" />
				{/if}
			</div>

			<div class="app-kpi-grid">
				<MetricCard
					label="Situação atual"
					value={trendTitle(
						selectedSubject?.trendDirection ?? data.journeySummary.latestEventTrend
					)}
					tone={trendTone(selectedSubject?.trendDirection ?? data.journeySummary.latestEventTrend)}
					valueTone="tone"
					helper={trendDescription(
						selectedSubject?.trendDirection ?? data.journeySummary.latestEventTrend
					)}
					compact={true}
				/>
				<MetricCard
					label="Impacto mais recente na média"
					value={latestImpactLabel}
					tone={trendTone(
						latestVisibleEvent?.trendDirection ?? data.journeySummary.latestEventTrend
					)}
					valueTone="tone"
					helper={latestVisibleEvent?.impactLabel ??
						'Assim que houver comparação suficiente, esta leitura mostrará o impacto do evento mais recente.'}
					compact={true}
				/>
				<MetricCard
					label="Pontos de virada"
					value={String(visibleTurningPoints.length)}
					tone={visibleTurningPoints.length > 0 ? 'attention' : 'neutral'}
					valueTone={visibleTurningPoints.length > 0 ? 'tone' : 'default'}
					helper={visibleTurningPoints.length > 0
						? 'Mudanças claras de direção no seu histórico recente.'
						: 'Nenhuma mudança brusca de direção no recorte atual.'}
					compact={true}
				/>
			</div>
		</div>

		<section class="app-card app-stack-md">
			<div class="app-header">
				<p class="app-eyebrow">Filtro</p>
				<h2 class="app-title">Matéria</h2>
				<p class="app-subtitle">
					Escolha uma matéria para acompanhar a trajetória específica ou mantenha a visão completa.
				</p>
			</div>

			<div>
				<label for="journey-subject-filter" class="block text-sm font-black text-slate-900">
					Filtrar por matéria
				</label>
				<select id="journey-subject-filter" bind:value={selectedSubjectId} class="app-select mt-2">
					<option value="all">Todas as matérias</option>
					{#each data.subjectOptions as subject (subject.id)}
						<option value={subject.id}>
							{subject.name}{subject.code ? ` · ${subject.code}` : ''}
						</option>
					{/each}
				</select>
			</div>

			{#if selectedSubject}
				<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p class="text-base font-black text-slate-950">{selectedSubject.name}</p>
							<p class="mt-1 text-sm text-slate-600">
								{selectedSubject.code ?? 'Sem código'} · {selectedSubject.publishedAssessments} publicação(ões)
							</p>
						</div>

						<StatusPill
							label={subjectTrendLabel(selectedSubject.trendDirection)}
							tone={trendTone(selectedSubject.trendDirection)}
							uppercase={true}
						/>
					</div>

					<div class="mt-4 grid gap-3 sm:grid-cols-2">
						<MetricCard
							label="Nota atual"
							value={formatGrade(selectedSubject.currentAverage)}
							tone="context"
							valueTone="tone"
							compact={true}
						/>
						<MetricCard
							label="Aproveitamento"
							value={formatPercent(selectedSubject.normalizedPercent)}
							tone={trendTone(selectedSubject.trendDirection)}
							valueTone="tone"
							compact={true}
						/>
					</div>
				</div>
			{/if}
		</section>
	</section>

	{#if data.journeyPortal.status !== 'ready'}
		<section class="app-empty-state">
			<p class="app-empty-state-title">Conclua um vínculo para liberar sua trajetória</p>
			<p class="app-empty-state-text">{data.journeyPortal.message}</p>
			<div class="mt-4 flex flex-wrap justify-center gap-3">
				<a href={resolve('/student')} class="app-button">Voltar ao início</a>
			</div>
		</section>
	{:else if visibleEvents.length === 0}
		<section class="app-empty-state">
			<p class="app-empty-state-title">Ainda não há eventos suficientes</p>
			<p class="app-empty-state-text">
				Assim que houver publicações no recorte selecionado, sua trajetória aparecerá aqui com
				comparação entre eventos.
			</p>
			<div class="mt-4 flex flex-wrap justify-center gap-3">
				<a href={resolve('/student')} class="app-button-secondary">Voltar ao início</a>
				<a href={resolve('/student/skills')} class="app-button">Ver matérias</a>
			</div>
		</section>
	{:else}
		<section class="app-card app-stack-lg">
			<div class="app-header">
				<p class="app-eyebrow">Linha do tempo</p>
				<h2 class="app-title">Evolução por evento publicado</h2>
				<p class="app-subtitle">
					Cada evento mostra o que mudou em relação ao anterior, o impacto na média acumulada e se
					houve ponto de virada.
				</p>
			</div>

			<div class="grid gap-4">
				{#each visibleEvents as event (event.assessmentId)}
					<article class="app-card-muted app-stack-md">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="text-lg font-black text-slate-950">{event.assessmentTitle}</p>
								<p class="mt-1 text-sm text-slate-600">
									{event.subjectName} · {formatDate(event.assessmentDate)}
								</p>
							</div>

							<div class="flex flex-wrap gap-2">
								<StatusPill
									label={eventDirectionLabel(event.eventDirection)}
									tone={eventTone(event.eventDirection)}
									uppercase={true}
								/>
								{#if event.isTurningPoint && event.turningPointLabel}
									<StatusPill label="Ponto de virada" tone="attention" uppercase={true} />
								{/if}
							</div>
						</div>

						<div class="grid gap-3 md:grid-cols-3">
							<MetricCard
								label="Nota"
								value={formatGrade(event.rawScore)}
								tone="context"
								valueTone="tone"
								compact={true}
							/>
							<MetricCard
								label="Aproveitamento"
								value={formatPercent(event.normalizedPercent)}
								tone={eventTone(event.eventDirection)}
								valueTone="tone"
								compact={true}
							/>
							<MetricCard
								label="Impacto na média"
								value={formatSignedPercent(event.impactOnAverage)}
								tone={trendTone(event.trendDirection)}
								valueTone="tone"
								compact={true}
							/>
						</div>

						<div class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
							<div class="rounded-3xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
									Leitura do evento
								</p>
								<p class="mt-2 text-sm font-semibold leading-7 text-slate-900">
									{event.comparisonLabel}
								</p>
								<p class="mt-2 text-sm leading-7 text-slate-600">{event.impactLabel}</p>

								{#if event.isTurningPoint && event.turningPointLabel}
									<p class="mt-3 text-sm font-semibold text-amber-700">
										{event.turningPointLabel}
									</p>
								{/if}
							</div>

							<div class="rounded-3xl border border-slate-200 bg-white p-4">
								<p class="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
									Comparação
								</p>

								<div class="mt-3 grid gap-3">
									<div>
										<p class="text-sm font-black text-slate-900">Evento anterior</p>
										<p class="mt-1 text-sm text-slate-600">
											{#if event.previousEvent}
												{event.previousEvent.assessmentTitle} · {formatPercent(
													event.previousEvent.normalizedPercent
												)}
											{:else}
												Sem referência anterior
											{/if}
										</p>
									</div>

									<div>
										<p class="text-sm font-black text-slate-900">Evento anterior da matéria</p>
										<p class="mt-1 text-sm text-slate-600">
											{#if event.previousSubjectEvent}
												{event.previousSubjectEvent.assessmentTitle} · {formatPercent(
													event.previousSubjectEvent.normalizedPercent
												)}
											{:else}
												Sem referência anterior da matéria
											{/if}
										</p>
									</div>

									<div class="grid gap-2 sm:grid-cols-2">
										<div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
											<p class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
												Delta geral
											</p>
											<p class="mt-1 text-sm font-semibold text-slate-900">
												{formatSignedPercent(event.changeFromPreviousEvent)}
											</p>
										</div>
										<div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
											<p class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
												Delta da matéria
											</p>
											<p class="mt-1 text-sm font-semibold text-slate-900">
												{formatSignedPercent(event.changeFromPreviousSubjectEvent)}
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</article>
				{/each}
			</div>
		</section>

		<section class="app-card app-stack-md">
			<div class="app-header">
				<p class="app-eyebrow">Resumo por matéria</p>
				<h2 class="app-title">Como cada matéria está agora</h2>
				<p class="app-subtitle">
					Use este bloco para fechar a leitura do longitudinal com um resumo do estado atual de cada
					matéria.
				</p>
			</div>

			<div class="grid gap-4 xl:grid-cols-2">
				{#each data.subjectOptions as subject (subject.id)}
					<article class="app-card-muted app-stack-md">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="text-lg font-black text-slate-950">{subject.name}</p>
								<p class="mt-1 text-sm text-slate-600">
									{subject.code ?? 'Sem código'} · {subject.publishedAssessments} publicação(ões)
								</p>
							</div>

							<StatusPill
								label={subjectTrendLabel(subject.trendDirection)}
								tone={trendTone(subject.trendDirection)}
								uppercase={true}
							/>
						</div>

						<div class="grid gap-3 sm:grid-cols-2">
							<MetricCard
								label="Nota atual"
								value={formatGrade(subject.currentAverage)}
								tone="context"
								valueTone="tone"
								compact={true}
							/>
							<MetricCard
								label="Aproveitamento"
								value={formatPercent(subject.normalizedPercent)}
								tone={trendTone(subject.trendDirection)}
								valueTone="tone"
								compact={true}
							/>
						</div>

						<p class="text-sm leading-7 text-slate-600">
							{#if subject.latestAssessmentTitle}
								Última publicação: {subject.latestAssessmentTitle} em {formatDate(
									subject.latestAssessmentDate
								)}.
							{:else}
								Sem publicação recente suficiente para leitura detalhada.
							{/if}
						</p>
					</article>
				{/each}
			</div>
		</section>
	{/if}
</div>
