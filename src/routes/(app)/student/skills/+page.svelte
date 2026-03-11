<script lang="ts">
	type SubjectStatus = 'good' | 'attention' | 'pending';

	type SubjectItem = {
		id: string;
		name: string;
		progress: number | null;
		score: number | null;
		status: SubjectStatus;
		description: string;
	};

	export let data: {
		authUser: {
			id: string;
			email: string | null;
		};
		subjectsPortal: {
			status: 'pending-link' | 'ready';
			message: string;
		};
		student: {
			displayName: string;
			className: string | null;
		};
		summary: {
			totalSubjects: number;
			subjectsWithScore: number;
			goodSubjects: number;
			attentionSubjects: number;
			pendingSubjects: number;
			generalAverage: number | null;
			generalPercent: number | null;
		};
		bestSubject: SubjectItem | null;
		prioritySubject: SubjectItem | null;
		subjects: SubjectItem[];
		academicSummary: {
			title: string;
			description: string;
		};
	};

	type FilterKey = 'all' | 'good' | 'attention' | 'pending';

	let activeFilter: FilterKey = 'all';

	const filterOptions: Array<{ key: FilterKey; label: string }> = [
		{ key: 'all', label: 'Todas' },
		{ key: 'good', label: 'Bom desempenho' },
		{ key: 'attention', label: 'Pedem atenção' },
		{ key: 'pending', label: 'Sem nota' }
	];

	const statusLabel = (status: SubjectStatus) => {
		if (status === 'good') return 'Bom desempenho';
		if (status === 'attention') return 'Pede atenção';
		return 'Sem nota';
	};

	const statusClass = (status: SubjectStatus) => {
		if (status === 'good') return 'good';
		if (status === 'attention') return 'attention';
		return 'pending';
	};

	const averageLabel = (value: number | null) => {
		if (typeof value !== 'number') return '—';
		return value.toFixed(1);
	};

	const percentLabel = (value: number | null) => {
		if (typeof value !== 'number') return '—';
		return `${value}%`;
	};

	$: filteredSubjects =
		activeFilter === 'all'
			? data.subjects
			: data.subjects.filter((subject) => subject.status === activeFilter);

	$: orderedSubjects = [...filteredSubjects].sort((a, b) => {
		const order = (status: SubjectStatus) => {
			if (status === 'attention') return 0;
			if (status === 'pending') return 1;
			return 2;
		};

		const statusCompare = order(a.status) - order(b.status);
		if (statusCompare !== 0) return statusCompare;

		const aProgress = a.progress ?? -1;
		const bProgress = b.progress ?? -1;
		return aProgress - bProgress;
	});

	$: pageTone =
		data.summary.attentionSubjects > 0 || data.summary.pendingSubjects > 0 ? 'highlight' : 'neutral';

	$: heroMessage =
		data.subjectsPortal.status === 'ready'
			? `Sua média geral atual é ${averageLabel(data.summary.generalAverage)} e esta página reúne o desempenho das suas matérias avaliadas.`
			: 'Seu vínculo acadêmico ainda não foi concluído.';
</script>

<svelte:head>
	<title>Student Subjects • Class Insights</title>
</svelte:head>

<section class="hero">
	<div>
		<div class="eyebrow">Matérias</div>
		<h1>Visão das matérias de {data.student.displayName}</h1>
		<p>
			{#if data.student.className}
				Turma: <strong>{data.student.className}</strong>. {heroMessage}
			{:else}
				{heroMessage}
			{/if}
		</p>
	</div>

	<div class={`summary-card ${pageTone}`}>
		<div class="summary-label">Média geral</div>
		<div class="summary-value">{averageLabel(data.summary.generalAverage)}</div>
		<div class="summary-foot">Baseada na média das matérias com nota lançada</div>

		{#if typeof data.summary.generalPercent === 'number'}
			<div class="summary-progress">
				<div class="summary-progress-track">
					<div
						class="summary-progress-fill"
						style={`width: ${data.summary.generalPercent}%`}
					></div>
				</div>
				<div class="summary-progress-value">{percentLabel(data.summary.generalPercent)}</div>
			</div>
		{/if}
	</div>
</section>

<section class="summary-grid">
	<article class="metric-card">
		<span class="metric-label">Total de matérias</span>
		<strong>{data.summary.totalSubjects}</strong>
	</article>

	<article class="metric-card">
		<span class="metric-label">Com nota</span>
		<strong>{data.summary.subjectsWithScore}</strong>
	</article>

	<article class="metric-card">
		<span class="metric-label">Bom desempenho</span>
		<strong>{data.summary.goodSubjects}</strong>
	</article>

	<article class={`metric-card ${pageTone}`}>
		<span class="metric-label">Pedem atenção</span>
		<strong>{data.summary.attentionSubjects + data.summary.pendingSubjects}</strong>
	</article>
</section>

<section class="insight-grid">
	<article class="insight-card good">
		<span class="insight-label">Melhor matéria</span>
		<strong>{data.bestSubject?.name ?? '—'}</strong>
		<p>
			{#if data.bestSubject}
				{data.bestSubject.description}
			{:else}
				Assim que houver notas lançadas, sua melhor matéria aparecerá aqui.
			{/if}
		</p>
	</article>

	<article class="insight-card attention">
		<span class="insight-label">Matéria que pede atenção</span>
		<strong>{data.prioritySubject?.name ?? '—'}</strong>
		<p>
			{#if data.prioritySubject}
				{data.prioritySubject.description}
			{:else}
				Assim que houver notas lançadas, a principal prioridade aparecerá aqui.
			{/if}
		</p>
	</article>
</section>

<section class="panel">
	<div class="panel-head">
		<div>
			<div class="section-kicker">Filtros</div>
			<h2>Ver por status</h2>
		</div>
		<p>Use os filtros para destacar rapidamente as matérias mais importantes no momento.</p>
	</div>

	<div class="filters">
		{#each filterOptions as option}
			<button
				type="button"
				class:active={activeFilter === option.key}
				class="filter-button"
				onclick={() => (activeFilter = option.key)}
			>
				{option.label}
			</button>
		{/each}
	</div>
</section>

<section class="panel">
	<div class="panel-head">
		<div>
			<div class="section-kicker">Desempenho por matéria</div>
			<h2>Suas matérias avaliadas</h2>
		</div>
		<p>
			As matérias aparecem com status visual para facilitar a leitura do que está bem, do que pede
			atenção e do que ainda não recebeu nota.
		</p>
	</div>

	{#if orderedSubjects.length > 0}
		<div class="subjects-grid">
			{#each orderedSubjects as subject}
				<article class="subject-card">
					<div class="subject-top">
						<div>
							<h3>{subject.name}</h3>
							<p>{subject.description}</p>
						</div>

						<span class={`status-badge ${statusClass(subject.status)}`}>
							{statusLabel(subject.status)}
						</span>
					</div>

					<div class="meta-row">
						<div class="meta-box">
							<span>Média</span>
							<strong>{averageLabel(subject.score)}</strong>
						</div>

						<div class="meta-box">
							<span>Desempenho</span>
							<strong>{percentLabel(subject.progress)}</strong>
						</div>
					</div>

					<div class="progress-track">
						<div
							class={`progress-fill ${statusClass(subject.status)}`}
							style={`width: ${subject.progress ?? 0}%`}
						></div>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<div class="empty-icon">📘</div>
			<h3>Nenhuma matéria neste filtro</h3>
			<p>Ajuste o filtro acima para voltar a ver as matérias disponíveis.</p>
		</div>
	{/if}
</section>

<section class="panel">
	<div class="panel-head">
		<div>
			<div class="section-kicker">Resumo acadêmico</div>
			<h2>{data.academicSummary.title}</h2>
		</div>
	</div>

	<div class={`summary-highlight ${pageTone}`}>
		<p>{data.academicSummary.description}</p>
	</div>
</section>

<style>
	.hero,
	.panel,
	.summary-card,
	.subject-card,
	.metric-card,
	.insight-card,
	.summary-highlight {
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid rgba(148, 163, 184, 0.2);
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
		border-radius: 1.25rem;
	}

	.hero,
	.panel {
		padding: 1.2rem;
		margin-bottom: 1rem;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(250px, 0.95fr);
		gap: 1rem;
		align-items: stretch;
	}

	.eyebrow,
	.section-kicker,
	.summary-label,
	.metric-label,
	.insight-label {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 0.35rem;
	}

	.hero h1,
	.panel-head h2,
	.subject-card h3 {
		margin: 0;
		line-height: 1.15;
		color: #0f172a;
	}

	.hero h1 {
		font-size: clamp(1.75rem, 3vw, 2.35rem);
		margin-top: 0.35rem;
	}

	.hero p,
	.panel-head p,
	.subject-card p,
	.summary-foot,
	.insight-card p,
	.summary-highlight p,
	.empty-state p {
		color: #475569;
		line-height: 1.6;
	}

	.hero p {
		margin: 0.7rem 0 0;
		max-width: 720px;
	}

	.summary-card {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0.05));
	}

	.summary-card.highlight {
		background: linear-gradient(180deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.06));
		border-color: rgba(245, 158, 11, 0.2);
	}

	.summary-card.neutral {
		background: linear-gradient(180deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
		border-color: rgba(34, 197, 94, 0.18);
	}

	.summary-value {
		font-size: 2.1rem;
		font-weight: 900;
		line-height: 1;
		letter-spacing: -0.04em;
		color: #1d4ed8;
	}

	.summary-foot {
		margin-top: 0.45rem;
		font-size: 0.9rem;
	}

	.summary-progress {
		margin-top: 0.9rem;
	}

	.summary-progress-track {
		height: 0.8rem;
		border-radius: 999px;
		background: #dbe3ef;
		overflow: hidden;
	}

	.summary-progress-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #2563eb, #1d4ed8);
	}

	.summary-progress-value {
		margin-top: 0.45rem;
		font-size: 0.92rem;
		font-weight: 800;
		color: #1d4ed8;
	}

	.summary-grid,
	.subjects-grid,
	.insight-grid {
		display: grid;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.summary-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.insight-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.subjects-grid {
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	}

	.metric-card,
	.insight-card,
	.subject-card {
		padding: 1rem;
	}

	.metric-card strong {
		display: block;
		margin-top: 0.45rem;
		font-size: 1.2rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.2;
	}

	.metric-card.highlight {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.2);
	}

	.metric-card.neutral {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.18);
	}

	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.panel-head p {
		margin: 0.15rem 0 0;
		max-width: 440px;
		font-size: 0.94rem;
	}

	.insight-card.good {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.18);
	}

	.insight-card.attention {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.18);
	}

	.insight-card strong {
		display: block;
		font-size: 1.05rem;
		color: #0f172a;
	}

	.insight-card p {
		margin: 0.45rem 0 0;
		font-size: 0.92rem;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.filter-button {
		height: 2.75rem;
		padding: 0 1rem;
		border-radius: 999px;
		border: 1px solid #cbd5e1;
		background: white;
		color: #334155;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition:
			transform 0.16s ease,
			background 0.16s ease,
			border-color 0.16s ease;
	}

	.filter-button:hover {
		transform: translateY(-1px);
	}

	.filter-button.active {
		background: rgba(37, 99, 235, 0.1);
		border-color: rgba(96, 165, 250, 0.35);
		color: #1d4ed8;
	}

	.subject-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.8rem;
		margin-bottom: 1rem;
	}

	.subject-card h3 {
		font-size: 1rem;
	}

	.subject-card p {
		margin: 0.42rem 0 0;
		font-size: 0.92rem;
	}

	.status-badge {
		padding: 0.45rem 0.7rem;
		border-radius: 999px;
		font-size: 0.76rem;
		font-weight: 800;
		white-space: nowrap;
	}

	.status-badge.good {
		background: rgba(34, 197, 94, 0.12);
		color: #166534;
	}

	.status-badge.attention {
		background: rgba(245, 158, 11, 0.14);
		color: #92400e;
	}

	.status-badge.pending {
		background: rgba(148, 163, 184, 0.18);
		color: #475569;
	}

	.meta-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.85rem;
	}

	.meta-box {
		padding: 0.82rem 0.88rem;
		border-radius: 0.95rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
	}

	.meta-box span {
		display: block;
		font-size: 0.78rem;
		font-weight: 700;
		color: #64748b;
		margin-bottom: 0.2rem;
	}

	.meta-box strong {
		color: #0f172a;
		font-size: 1rem;
	}

	.progress-track {
		height: 0.8rem;
		border-radius: 999px;
		background: #dbe3ef;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 999px;
	}

	.progress-fill.good {
		background: linear-gradient(90deg, #22c55e, #16a34a);
	}

	.progress-fill.attention {
		background: linear-gradient(90deg, #f59e0b, #d97706);
	}

	.progress-fill.pending {
		background: linear-gradient(90deg, #94a3b8, #64748b);
	}

	.summary-highlight {
		padding: 1rem 1.1rem;
		background: rgba(248, 250, 252, 0.92);
	}

	.summary-highlight.highlight {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.18);
	}

	.summary-highlight.neutral {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.18);
	}

	.summary-highlight p {
		margin: 0;
		font-size: 0.96rem;
	}

	.empty-state {
		padding: 1.4rem;
		border-radius: 1rem;
		border: 1px dashed #cbd5e1;
		background: rgba(248, 250, 252, 0.9);
		text-align: center;
	}

	.empty-icon {
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}

	.empty-state h3 {
		font-size: 1.2rem;
		margin: 0;
		color: #0f172a;
	}

	.empty-state p {
		margin: 0.65rem auto 0;
		max-width: 620px;
	}

	@media (max-width: 980px) {
		.hero,
		.summary-grid,
		.insight-grid {
			grid-template-columns: 1fr;
		}

		.panel-head {
			flex-direction: column;
		}
	}

	@media (max-width: 640px) {
		.subject-top,
		.meta-row {
			grid-template-columns: 1fr;
			flex-direction: column;
		}

		.filters {
			flex-direction: column;
		}

		.filter-button {
			width: 100%;
		}
	}
</style>