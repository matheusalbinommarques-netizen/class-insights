<script lang="ts">
	type SubjectStatus = 'good' | 'attention' | 'pending';

	type SubjectCard = {
		subjectId: string;
		subjectName: string;
		score: number | null;
		progress: number | null;
		status: SubjectStatus;
		description: string;
	};

	export let data: {
		authUser: {
			id: string;
			email: string | null;
		};
		portal: {
			status: 'pending-link' | 'ready';
			message: string;
		};
		summary: {
			studentName: string;
			className: string | null;
			totalSubjects: number;
			subjectsWithScore: number;
			goodSubjects: number;
			attentionSubjects: number;
			pendingSubjects: number;
			generalAverage: number | null;
			generalPercent: number | null;
		};
		bestSubject: SubjectCard | null;
		prioritySubject: SubjectCard | null;
		subjects: SubjectCard[];
		academicSummary: {
			title: string;
			description: string;
		};
	};

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

	$: heroLine =
		data.portal.status === 'ready'
			? `Sua média geral atual é ${averageLabel(data.summary.generalAverage)}.`
			: 'Seu acesso acadêmico ainda não foi concluído.';

	$: recommendationLine =
		data.portal.status !== 'ready'
			? 'Conclua o vínculo da sua conta para visualizar suas matérias avaliadas.'
			: data.bestSubject && data.prioritySubject
				? `Sua melhor matéria no momento é ${data.bestSubject.subjectName}, e a que mais pede atenção é ${data.prioritySubject.subjectName}.`
				: data.bestSubject
					? `Sua melhor matéria no momento é ${data.bestSubject.subjectName}.`
					: data.prioritySubject
						? `A matéria que mais pede atenção agora é ${data.prioritySubject.subjectName}.`
						: 'Assim que novas notas forem lançadas, sua visão geral aparecerá aqui.';

	$: nextActionTitle =
		data.prioritySubject?.status === 'pending'
			? 'Aguardando nota'
			: 'Próxima recomendação';

	$: nextActionText =
		data.prioritySubject?.status === 'pending'
			? `A matéria ${data.prioritySubject.subjectName} ainda não possui nota lançada.`
			: data.prioritySubject
				? `Vale revisar ${data.prioritySubject.subjectName} primeiro para equilibrar seu desempenho geral.`
				: 'Continue acompanhando suas matérias para manter sua visão acadêmica atualizada.';

	$: attentionTone =
		data.summary.attentionSubjects > 0 || data.summary.pendingSubjects > 0 ? 'highlight' : 'neutral';
</script>

<svelte:head>
	<title>Student Home • Class Insights</title>
</svelte:head>

{#if data.portal.status === 'pending-link'}
	<section class="hero">
		<div class="hero-copy">
			<div class="eyebrow">Início</div>
			<h1>Olá, {data.summary.studentName}</h1>
			<p>
				Seu portal do aluno já está pronto para uso, mas ainda precisamos concluir o vínculo da sua
				conta com os dados acadêmicos.
			</p>
		</div>

		<div class="hero-metric waiting">
			<div class="metric-label">Status</div>
			<div class="metric-value small">Aguardando vínculo</div>
			<div class="metric-foot">{data.portal.message}</div>
		</div>
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Resumo acadêmico</div>
				<h2>{data.academicSummary.title}</h2>
			</div>
		</div>

		<div class="empty-state">
			<div class="empty-icon">🎓</div>
			<h3>Seu acesso acadêmico ainda não está completo</h3>
			<p>{data.academicSummary.description}</p>
			<a href="/student/skills" class="primary-link">Ir para matérias</a>
		</div>
	</section>
{:else}
	<section class="hero">
		<div class="hero-copy">
			<div class="eyebrow">Início</div>
			<h1>Olá, {data.summary.studentName}</h1>
			<p>{heroLine}</p>
			<p class="hero-subline">{recommendationLine}</p>

			<div class="hero-actions">
				<a href="/student/skills" class="primary-link">Ver minhas matérias</a>

				{#if data.prioritySubject}
					<a href="/student/skills" class="secondary-link">Ver matéria prioritária</a>
				{/if}
			</div>
		</div>

		<div class="hero-metric">
			<div class="metric-label">Média geral</div>
			<div class="metric-value">{averageLabel(data.summary.generalAverage)}</div>
			<div class="metric-foot">Baseada na média das matérias avaliadas</div>

			{#if typeof data.summary.generalPercent === 'number'}
				<div class="hero-progress">
					<div class="hero-progress-label">Desempenho consolidado</div>
					<div class="hero-progress-track">
						<div
							class="hero-progress-fill"
							style={`width: ${data.summary.generalPercent}%`}
						></div>
					</div>
					<div class="hero-progress-value">{percentLabel(data.summary.generalPercent)}</div>
				</div>
			{/if}
		</div>
	</section>

	<section class="stats-row">
		<article class="mini-stat">
			<div class="mini-stat-label">Matérias avaliadas</div>
			<div class="mini-stat-value">{data.summary.subjectsWithScore}</div>
		</article>

		<article class="mini-stat">
			<div class="mini-stat-label">Total de matérias</div>
			<div class="mini-stat-value">{data.summary.totalSubjects}</div>
		</article>

		<article class="mini-stat">
			<div class="mini-stat-label">Bom desempenho</div>
			<div class="mini-stat-value">{data.summary.goodSubjects}</div>
		</article>

		<article class={`mini-stat ${attentionTone}`}>
			<div class="mini-stat-label">Pedem atenção</div>
			<div class="mini-stat-value">{data.summary.attentionSubjects + data.summary.pendingSubjects}</div>
		</article>
	</section>

	<section class="action-grid">
		<article class="action-card good">
			<div class="card-label">Melhor matéria</div>
			<h2>{data.bestSubject?.subjectName ?? '—'}</h2>
			<p>
				{#if data.bestSubject}
					{data.bestSubject.description}
				{:else}
					Assim que houver notas lançadas, sua melhor matéria aparecerá aqui.
				{/if}
			</p>

			{#if data.bestSubject}
				<div class="action-meta">
					<div class="meta-chip">Média: {averageLabel(data.bestSubject.score)}</div>
					<div class="meta-chip">Desempenho: {percentLabel(data.bestSubject.progress)}</div>
				</div>
			{/if}
		</article>

		<article class="action-card attention">
			<div class="card-label">Matéria que pede atenção</div>
			<h2>{data.prioritySubject?.subjectName ?? '—'}</h2>
			<p>
				{#if data.prioritySubject}
					{data.prioritySubject.description}
				{:else}
					Assim que houver notas lançadas, a principal prioridade aparecerá aqui.
				{/if}
			</p>

			<div class="action-footer">
				{#if data.prioritySubject}
					<div class="action-meta">
						{#if typeof data.prioritySubject.score === 'number'}
							<div class="meta-chip">Média: {averageLabel(data.prioritySubject.score)}</div>
						{/if}
						{#if typeof data.prioritySubject.progress === 'number'}
							<div class="meta-chip">Desempenho: {percentLabel(data.prioritySubject.progress)}</div>
						{/if}
					</div>
				{/if}

				<a href="/student/skills" class="text-link">Ver matérias</a>
			</div>
		</article>

		<article class="action-card neutral">
			<div class="card-label">{nextActionTitle}</div>
			<h2>O que olhar agora</h2>
			<p>{nextActionText}</p>

			<div class="action-footer">
				<a href="/student/skills" class="text-link">Continuar acompanhamento</a>
			</div>
		</article>
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Desempenho por matéria</div>
				<h2>Visão consolidada do momento</h2>
			</div>
			<p>
				Aqui você acompanha como está em cada matéria avaliada no momento.
			</p>
		</div>

		{#if data.subjects.length > 0}
			<div class="subject-grid">
				{#each data.subjects as subject}
					<article class="subject-card">
						<div class="subject-top">
							<div>
								<h3>{subject.subjectName}</h3>
								<p>{subject.description}</p>
							</div>

							<span class={`status-badge ${statusClass(subject.status)}`}>
								{statusLabel(subject.status)}
							</span>
						</div>

						<div class="subject-meta">
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
			<div class="empty-state compact">
				<p>Nenhuma matéria disponível no momento.</p>
			</div>
		{/if}
	</section>

	<section class="panel summary-panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Resumo acadêmico</div>
				<h2>{data.academicSummary.title}</h2>
			</div>
		</div>

		<div class={`summary-highlight ${attentionTone}`}>
			<p>{data.academicSummary.description}</p>
		</div>
	</section>
{/if}

<style>
	.hero,
	.panel,
	.mini-stat,
	.action-card,
	.subject-card,
	.summary-highlight {
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid rgba(148, 163, 184, 0.2);
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
		border-radius: 1.25rem;
	}

	.hero,
	.panel {
		padding: 1.25rem;
		margin-bottom: 1rem;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.9fr);
		gap: 1rem;
		align-items: stretch;
	}

	.eyebrow,
	.section-kicker,
	.card-label,
	.metric-label,
	.mini-stat-label {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
	}

	.hero h1,
	.panel-head h2,
	.action-card h2,
	.subject-card h3,
	.empty-state h3 {
		margin: 0;
		line-height: 1.12;
		color: #0f172a;
	}

	.hero h1 {
		font-size: clamp(1.8rem, 3vw, 2.5rem);
		margin-top: 0.35rem;
	}

	.hero p,
	.panel-head p,
	.action-card p,
	.subject-card p,
	.metric-foot,
	.empty-state p,
	.summary-highlight p {
		color: #475569;
		line-height: 1.65;
	}

	.hero p {
		margin: 0.75rem 0 0;
		max-width: 720px;
	}

	.hero-subline {
		font-size: 1rem;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.hero-metric {
		padding: 1rem;
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0.05));
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.hero-metric.waiting {
		background: linear-gradient(180deg, rgba(148, 163, 184, 0.16), rgba(148, 163, 184, 0.08));
	}

	.metric-value {
		margin-top: 0.45rem;
		font-size: 2.35rem;
		font-weight: 900;
		letter-spacing: -0.04em;
		color: #1d4ed8;
		line-height: 1;
	}

	.metric-value.small {
		font-size: 1.15rem;
		line-height: 1.2;
		letter-spacing: normal;
	}

	.metric-foot {
		margin-top: 0.55rem;
		font-size: 0.92rem;
	}

	.hero-progress {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(148, 163, 184, 0.2);
	}

	.hero-progress-label {
		font-size: 0.82rem;
		font-weight: 700;
		color: #64748b;
		margin-bottom: 0.45rem;
	}

	.hero-progress-track {
		height: 0.8rem;
		border-radius: 999px;
		background: #dbe3ef;
		overflow: hidden;
	}

	.hero-progress-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #2563eb, #1d4ed8);
	}

	.hero-progress-value {
		margin-top: 0.45rem;
		font-size: 0.92rem;
		font-weight: 800;
		color: #1d4ed8;
	}

	.stats-row,
	.action-grid,
	.subject-grid {
		display: grid;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.stats-row {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.action-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.subject-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.mini-stat,
	.action-card,
	.subject-card {
		padding: 1rem;
	}

	.mini-stat-value {
		margin-top: 0.4rem;
		font-size: 1.35rem;
		font-weight: 900;
		color: #0f172a;
		line-height: 1.1;
	}

	.mini-stat.highlight {
		background: rgba(245, 158, 11, 0.12);
		border-color: rgba(245, 158, 11, 0.2);
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
		max-width: 460px;
		font-size: 0.94rem;
	}

	.action-card.good {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.18);
	}

	.action-card.attention {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.18);
	}

	.action-card.neutral {
		background: rgba(248, 250, 252, 0.92);
	}

	.action-card h2 {
		font-size: 1.05rem;
		margin-top: 0.45rem;
	}

	.action-card p {
		margin: 0.55rem 0 0;
		font-size: 0.94rem;
	}

	.action-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		margin-top: 0.85rem;
	}

	.meta-chip {
		padding: 0.45rem 0.7rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(148, 163, 184, 0.18);
		font-size: 0.82rem;
		font-weight: 700;
		color: #334155;
	}

	.action-footer {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		margin-top: 1rem;
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
		padding: 0.45rem 0.75rem;
		border-radius: 999px;
		font-size: 0.76rem;
		font-weight: 800;
		white-space: nowrap;
	}

	.status-badge.good {
		background: rgba(34, 197, 94, 0.14);
		color: #166534;
	}

	.status-badge.attention {
		background: rgba(245, 158, 11, 0.16);
		color: #92400e;
	}

	.status-badge.pending {
		background: rgba(148, 163, 184, 0.18);
		color: #475569;
	}

	.subject-meta {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.85rem;
	}

	.meta-box {
		padding: 0.82rem 0.9rem;
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

	.summary-panel {
		margin-bottom: 0;
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
		padding: 1.35rem;
		border-radius: 1rem;
		border: 1px dashed #cbd5e1;
		background: rgba(248, 250, 252, 0.9);
		text-align: center;
	}

	.empty-state.compact {
		padding: 1rem;
	}

	.empty-icon {
		font-size: 2rem;
		margin-bottom: 0.55rem;
	}

	.primary-link,
	.secondary-link,
	.text-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		font-weight: 700;
		transition:
			transform 0.16s ease,
			box-shadow 0.16s ease,
			background 0.16s ease;
	}

	.primary-link,
	.secondary-link {
		height: 2.9rem;
		padding: 0 1rem;
		border-radius: 0.92rem;
		font-size: 0.95rem;
	}

	.primary-link {
		border: 0;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
	}

	.secondary-link {
		background: white;
		color: #0f172a;
		border: 1px solid #cbd5e1;
	}

	.text-link {
		font-size: 0.92rem;
		color: #1d4ed8;
	}

	.primary-link:hover,
	.secondary-link:hover,
	.text-link:hover {
		transform: translateY(-1px);
	}

	@media (max-width: 980px) {
		.hero,
		.stats-row,
		.action-grid,
		.subject-grid {
			grid-template-columns: 1fr;
		}

		.panel-head {
			flex-direction: column;
		}
	}

	@media (max-width: 640px) {
		.hero-actions,
		.action-meta {
			flex-direction: column;
			align-items: stretch;
		}

		.subject-top {
			flex-direction: column;
		}

		.primary-link,
		.secondary-link {
			width: 100%;
		}

		.subject-meta {
			grid-template-columns: 1fr;
		}
	}
</style>