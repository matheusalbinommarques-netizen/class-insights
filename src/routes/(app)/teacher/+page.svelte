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

	const formState = $derived(($page.form ?? null) as ActionFeedback | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);
	const formAction = $derived(formState?.action ?? null);

	const hasClasses = $derived(data.classes.length > 0);

	const formatDate = (value: string | null) => {
		if (!value) return 'Nunca';
		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return 'Data indisponível';

		return new Intl.DateTimeFormat('pt-BR', {
			dateStyle: 'medium'
		}).format(date);
	};

	const formatPercent = (value: number | null) => {
		if (typeof value !== 'number') return '—';
		return `${value}%`;
	};

	const formatDelta = (value: number | null) => {
		if (typeof value !== 'number') return 'Sem baseline';
		const rounded = value.toFixed(2);
		return `${value >= 0 ? '+' : ''}${rounded}`;
	};

	const statusLabel = (status: ClassCard['status']) => {
		if (status === 'healthy') return 'Saudável';
		if (status === 'attention') return 'Atenção';
		if (status === 'critical') return 'Crítica';
		return 'Configuração';
	};

	const statusClass = (status: ClassCard['status']) => {
		if (status === 'healthy') return 'good';
		if (status === 'attention') return 'warn';
		if (status === 'critical') return 'risk';
		return 'setup';
	};

	const coverageClass = (coverage: number) => {
		if (coverage < 50) return 'risk';
		if (coverage < 85) return 'warn';
		return 'good';
	};

	const confirmDelete = (event: MouseEvent) => {
		if (!confirm('Deletar esta turma? Isso remove alunos, skills e scores.')) {
			event.preventDefault();
		}
	};

	const feedbackTone = $derived(
		formMessage ? (formSuccess ? 'success' : 'error') : null
	);

	const quickGuidance = $derived(
		data.summary.totalClasses === 0
			? [
					'Crie sua primeira turma',
					'Cadastre skills e alunos',
					'Comece a lançar ou importar notas'
				]
			: [
					'Priorize turmas com risco alto',
					'Use snapshot para manter histórico auditável',
					'Importe notas direto no contexto da turma'
				]
	);
</script>

<svelte:head>
	<title>Teacher Dashboard • Class Insights</title>
</svelte:head>

<section class="hero">
	<div class="hero-copy">
		<div class="eyebrow">Workspace do professor</div>
		<h1>Olá, {data.summary.displayName}.</h1>
		<p>{data.summary.message}</p>

		<div class="hero-actions">
			<a href="#create-class" class="primary-button">Criar nova turma</a>
			<a href="/teacher/import" class="secondary-button">Importar notas</a>
		</div>
	</div>

	<div class="hero-side">
		<div class="hero-side-label">Resumo executivo</div>
		<div class="hero-side-grid">
			<div class="hero-side-item">
				<span>Turmas em risco</span>
				<strong>{data.summary.classesAtRisk}</strong>
			</div>
			<div class="hero-side-item">
				<span>Snapshots pendentes</span>
				<strong>{data.summary.classesNeedingSnapshot}</strong>
			</div>
			<div class="hero-side-item">
				<span>Alunos em risco</span>
				<strong>{data.summary.totalRiskStudents}</strong>
			</div>
			<div class="hero-side-item">
				<span>Pendências de lançamento</span>
				<strong>{data.summary.totalPendingCells}</strong>
			</div>
		</div>
	</div>
</section>

<section class="summary-grid">
	<article class="summary-card">
		<div class="summary-label">Turmas ativas</div>
		<div class="summary-value">{data.summary.totalClasses}</div>
		<div class="summary-foot">Portfólio atual do professor</div>
	</article>

	<article class="summary-card">
		<div class="summary-label">Alunos ativos</div>
		<div class="summary-value">{data.summary.totalStudents}</div>
		<div class="summary-foot">Base monitorada nas turmas</div>
	</article>

	<article class="summary-card">
		<div class="summary-label">Turmas saudáveis</div>
		<div class="summary-value">{data.summary.healthyClasses}</div>
		<div class="summary-foot">Sem alerta crítico imediato</div>
	</article>

	<article class="summary-card">
		<div class="summary-label">Turmas em setup</div>
		<div class="summary-value">{data.summary.classesInSetup}</div>
		<div class="summary-foot">Ainda precisam de alunos ou skills</div>
	</article>
</section>

{#if formMessage}
	<div class={`feedback ${feedbackTone}`}>
		{formMessage}
	</div>
{/if}

{#if data.error}
	<div class="feedback error">{data.error}</div>
{/if}

<section class="dashboard-grid">
	<div class="main-column">
		<section class="panel attention-panel">
			<div class="panel-head">
				<div>
					<div class="section-kicker">Fila de ação</div>
					<h2>O que merece atenção agora</h2>
				</div>
				<p>
					Aqui entram as próximas melhores ações para o professor, em vez de só configuração.
				</p>
			</div>

			{#if data.actionQueue.length === 0}
				<div class="empty-state">
					<h3>Nenhuma pendência urgente</h3>
					<p>
						Suas turmas não têm alertas prioritários neste momento. Você pode seguir com
						importações, novas avaliações ou novas turmas.
					</p>
				</div>
			{:else}
				<div class="action-list">
					{#each data.actionQueue as item}
						<article class="action-item">
							<div class="action-copy">
								<strong>{item.title}</strong>
								<p>{item.description}</p>
							</div>

							<a href={item.href} class="secondary-button">{item.ctaLabel}</a>
						</article>
					{/each}
				</div>
			{/if}
		</section>

		<section class="panel classes-panel">
			<div class="panel-head">
				<div>
					<div class="section-kicker">Cockpit de turmas</div>
					<h2>Turmas vivas, não só cadastradas</h2>
				</div>
				<p>
					Os cards abaixo priorizam saúde, risco, cobertura e recência para ajudar na tomada de
					decisão.
				</p>
			</div>

			{#if !hasClasses}
				<div class="empty-state empty-hero">
					<div class="empty-badge">CI</div>
					<h3>Pronto para transformar dados em progresso?</h3>
					<p>
						Crie sua primeira turma para começar a operar o fluxo real de professor, notas,
						skills, snapshots e insights.
					</p>
					<a href="#create-class" class="primary-button">Criar primeira turma</a>
				</div>
			{:else}
				<div class="classes-grid">
					{#each data.classes as c}
						<article class="class-card">
							<div class="class-card-head">
								<div>
									<div class="class-name-row">
										<h3>{c.name}</h3>
										<span class={`status-badge ${statusClass(c.status)}`}>
											{statusLabel(c.status)}
										</span>
									</div>

									<p class="class-subtitle">
										Criada em {formatDate(c.created_at)} • {c.scaleLabel}
									</p>
								</div>

								<details class="options-menu">
									<summary aria-label="Mais opções">⋯</summary>
									<div class="options-popover">
										<form method="POST" action="?/deleteClass">
											<input type="hidden" name="classId" value={c.id} />
											<button type="submit" class="danger-option" onclick={confirmDelete}>
												Excluir turma
											</button>
										</form>
									</div>
								</details>
							</div>

							<div class="card-metrics">
								<div class="metric-box">
									<span>Aproveitamento</span>
									<strong>{formatPercent(c.averagePercent)}</strong>
								</div>

								<div class="metric-box">
									<span>Alunos em risco</span>
									<strong>{c.riskStudentsCount}</strong>
								</div>

								<div class="metric-box">
									<span>Cobertura</span>
									<strong class={coverageClass(c.coveragePercent)}>
										{c.coveragePercent}%
									</strong>
								</div>

								<div class="metric-box">
									<span>Último snapshot</span>
									<strong>{formatDate(c.latestSnapshotDate)}</strong>
								</div>
							</div>

							<div class="card-meta-row">
								<div class="meta-pill">
									<span>Alunos</span>
									<strong>{c.studentsCount}</strong>
								</div>

								<div class="meta-pill">
									<span>Skills</span>
									<strong>{c.skillsCount}</strong>
								</div>

								<div class="meta-pill">
									<span>Pendências</span>
									<strong>{c.pendingCells}</strong>
								</div>

								<div class="meta-pill">
									<span>Tendência</span>
									<strong class:positive={typeof c.trendDelta === 'number' && c.trendDelta >= 0}
										class:negative={typeof c.trendDelta === 'number' && c.trendDelta < 0}>
										{formatDelta(c.trendDelta)}
									</strong>
								</div>
							</div>

							{#if c.focusSkills.length > 0}
								<div class="focus-box">
									<div class="focus-label">Top lacunas atuais</div>
									<div class="focus-tags">
										{#each c.focusSkills as skillName}
											<span>{skillName}</span>
										{/each}
									</div>
								</div>
							{/if}

							<div class="card-footer">
								<a href={`/teacher/${c.id}`} class="primary-button">Abrir turma</a>

								<a href={`/teacher/import?classId=${c.id}`} class="secondary-button">
									Importar notas
								</a>

								<form method="POST" action="?/generateClassSnapshot">
									<input type="hidden" name="classId" value={c.id} />
									<button
										type="submit"
										class="secondary-button"
										disabled={c.studentsCount === 0 || c.skillsCount === 0}
									>
										Gerar snapshot
									</button>
								</form>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<aside class="side-column">
		<section class="panel create-panel" id="create-class">
			<div class="panel-head compact">
				<div>
					<div class="section-kicker">Nova turma</div>
					<h2>Criar turma</h2>
				</div>
			</div>

			<form method="POST" action="?/createClass" class="create-form">
				<div class="field">
					<label for="class-name">Nome da turma</label>
					<input id="class-name" name="name" placeholder="Ex: 2º Ano A" />
				</div>

				<div class="form-mini-grid">
					<div class="field">
						<label for="score-min">Min</label>
						<input id="score-min" name="score_min" type="number" step="any" bind:value={newMin} />
					</div>

					<div class="field">
						<label for="score-max">Max</label>
						<input id="score-max" name="score_max" type="number" step="any" bind:value={newMax} />
					</div>

					<div class="field">
						<label for="score-decimals">Decimais</label>
						<input
							id="score-decimals"
							name="score_decimals"
							type="number"
							min="0"
							max="6"
							bind:value={newDecimals}
						/>
					</div>
				</div>

				<div class="scale-preview">
					Escala padrão: <strong>{newMin}–{newMax}</strong> • dec <strong>{newDecimals}</strong>
				</div>

				<button type="submit" class="primary-button">Criar turma</button>
			</form>
		</section>

		<section class="panel">
			<div class="panel-head compact">
				<div>
					<div class="section-kicker">Próximos movimentos</div>
					<h2>Guia rápido</h2>
				</div>
			</div>

			<ul class="guidance-list">
				{#each quickGuidance as item}
					<li>{item}</li>
				{/each}
			</ul>
		</section>

		<section class="panel">
			<div class="panel-head compact">
				<div>
					<div class="section-kicker">Visão geral</div>
					<h2>Saúde do workspace</h2>
				</div>
			</div>

			<div class="mini-stats">
				<div class="mini-stat">
					<span>Saudáveis</span>
					<strong>{data.summary.healthyClasses}</strong>
				</div>

				<div class="mini-stat">
					<span>Em setup</span>
					<strong>{data.summary.classesInSetup}</strong>
				</div>

				<div class="mini-stat">
					<span>Com risco</span>
					<strong>{data.summary.classesAtRisk}</strong>
				</div>

				<div class="mini-stat">
					<span>Snapshot pendente</span>
					<strong>{data.summary.classesNeedingSnapshot}</strong>
				</div>
			</div>
		</section>
	</aside>
</section>

<style>
	.hero,
	.summary-card,
	.panel,
	.class-card,
	.action-item,
	.metric-box,
	.meta-pill,
	.focus-box,
	.mini-stat {
		background: rgba(255, 255, 255, 0.94);
		border: 1px solid rgba(148, 163, 184, 0.18);
		border-radius: 1.25rem;
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
	}

	.hero {
		padding: 1.4rem;
		margin-bottom: 1rem;
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.85fr);
		gap: 1rem;
		align-items: stretch;
	}

	.hero-copy h1,
	.panel-head h2,
	.class-card h3,
	.empty-state h3 {
		margin: 0;
		color: #0f172a;
		line-height: 1.08;
	}

	.hero-copy h1 {
		font-size: clamp(2rem, 3.5vw, 3rem);
		letter-spacing: -0.04em;
	}

	.hero-copy p,
	.hero-side-item span,
	.panel-head p,
	.class-subtitle,
	.empty-state p,
	.action-copy p,
	.guidance-list,
	.mini-stat span,
	.scale-preview {
		color: #475569;
		line-height: 1.7;
	}

	.eyebrow,
	.section-kicker,
	.summary-label,
	.hero-side-label,
	.focus-label {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 0.35rem;
	}

	.hero-actions,
	.card-footer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.primary-button,
	.secondary-button {
		height: 2.95rem;
		padding: 0 1rem;
		border-radius: 0.95rem;
		font-weight: 800;
		font-size: 0.95rem;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition:
			transform 0.16s ease,
			box-shadow 0.16s ease,
			background 0.16s ease,
			border-color 0.16s ease,
			opacity 0.16s ease;
	}

	.primary-button {
		border: 0;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
	}

	.secondary-button {
		background: white;
		color: #0f172a;
		border: 1px solid #cbd5e1;
	}

	.primary-button:hover,
	.secondary-button:hover {
		transform: translateY(-1px);
	}

	.primary-button:disabled,
	.secondary-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
	}

	.hero-side {
		padding: 1rem;
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.03));
		border: 1px solid rgba(96, 165, 250, 0.22);
	}

	.hero-side-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.hero-side-item {
		padding: 0.9rem;
		border-radius: 1rem;
		background: white;
		border: 1px solid rgba(148, 163, 184, 0.14);
	}

	.hero-side-item span {
		display: block;
		font-size: 0.8rem;
		margin-bottom: 0.2rem;
	}

	.hero-side-item strong {
		font-size: 1.3rem;
		color: #0f172a;
		line-height: 1.1;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.summary-card {
		padding: 1rem;
	}

	.summary-value {
		font-size: 1.8rem;
		font-weight: 900;
		color: #0f172a;
		line-height: 1.05;
	}

	.summary-foot {
		margin-top: 0.45rem;
		font-size: 0.88rem;
		color: #64748b;
		line-height: 1.5;
	}

	.feedback {
		margin-bottom: 1rem;
		padding: 0.95rem 1rem;
		border-radius: 1rem;
		font-size: 0.92rem;
		font-weight: 700;
	}

	.feedback.success {
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(34, 197, 94, 0.22);
		color: #166534;
	}

	.feedback.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		color: #991b1b;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.85fr);
		gap: 1rem;
		align-items: start;
	}

	.main-column,
	.side-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}

	.panel {
		padding: 1.2rem;
	}

	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.panel-head.compact {
		margin-bottom: 0.85rem;
	}

	.panel-head p {
		max-width: 460px;
		margin: 0.15rem 0 0;
		font-size: 0.94rem;
	}

	.action-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.action-item {
		padding: 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.action-copy strong {
		display: block;
		color: #0f172a;
		font-size: 0.98rem;
		margin-bottom: 0.2rem;
	}

	.classes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1rem;
	}

	.class-card {
		padding: 1rem;
	}

	.class-card-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.class-name-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.class-card h3 {
		font-size: 1.08rem;
	}

	.class-subtitle {
		margin: 0.35rem 0 0;
		font-size: 0.88rem;
	}

	.status-badge {
		padding: 0.4rem 0.72rem;
		border-radius: 999px;
		font-size: 0.74rem;
		font-weight: 900;
		white-space: nowrap;
	}

	.status-badge.good {
		background: rgba(34, 197, 94, 0.12);
		color: #166534;
	}

	.status-badge.warn {
		background: rgba(245, 158, 11, 0.14);
		color: #92400e;
	}

	.status-badge.risk {
		background: rgba(239, 68, 68, 0.12);
		color: #991b1b;
	}

	.status-badge.setup {
		background: rgba(148, 163, 184, 0.16);
		color: #475569;
	}

	.options-menu {
		position: relative;
	}

	.options-menu summary {
		list-style: none;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 0.8rem;
		display: grid;
		place-items: center;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #475569;
		cursor: pointer;
		font-size: 1.1rem;
		font-weight: 900;
	}

	.options-menu summary::-webkit-details-marker {
		display: none;
	}

	.options-popover {
		position: absolute;
		right: 0;
		top: calc(100% + 0.35rem);
		min-width: 150px;
		padding: 0.5rem;
		border-radius: 0.9rem;
		background: white;
		border: 1px solid rgba(148, 163, 184, 0.18);
		box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
		z-index: 5;
	}

	.danger-option {
		width: 100%;
		height: 2.5rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(239, 68, 68, 0.18);
		background: white;
		color: #b91c1c;
		font-weight: 800;
		cursor: pointer;
	}

	.card-metrics {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.85rem;
	}

	.metric-box {
		padding: 0.85rem 0.9rem;
		background: #f8fafc;
	}

	.metric-box span,
	.meta-pill span {
		display: block;
		font-size: 0.76rem;
		font-weight: 800;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 0.2rem;
	}

	.metric-box strong,
	.meta-pill strong {
		color: #0f172a;
		font-size: 1rem;
	}

	.metric-box strong.good,
	.meta-pill strong.positive {
		color: #166534;
	}

	.metric-box strong.warn {
		color: #92400e;
	}

	.metric-box strong.risk,
	.meta-pill strong.negative {
		color: #991b1b;
	}

	.card-meta-row {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.65rem;
		margin-bottom: 0.85rem;
	}

	.meta-pill {
		padding: 0.75rem 0.8rem;
		background: rgba(248, 250, 252, 0.9);
	}

	.focus-box {
		padding: 0.9rem;
		background: rgba(37, 99, 235, 0.05);
		margin-bottom: 0.95rem;
	}

	.focus-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.focus-tags span {
		padding: 0.42rem 0.65rem;
		border-radius: 999px;
		background: white;
		border: 1px solid rgba(148, 163, 184, 0.2);
		font-size: 0.8rem;
		font-weight: 700;
		color: #23415f;
	}

	.card-footer form {
		display: inline-flex;
	}

	.empty-state {
		padding: 1.2rem;
		border-radius: 1rem;
		border: 1px dashed #cbd5e1;
		background: rgba(248, 250, 252, 0.88);
		text-align: center;
	}

	.empty-hero {
		padding: 2rem 1.2rem;
	}

	.empty-badge {
		width: 3rem;
		height: 3rem;
		margin: 0 auto 0.75rem;
		border-radius: 1rem;
		display: grid;
		place-items: center;
		font-weight: 900;
		color: white;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
	}

	.empty-state .primary-button {
		margin-top: 1rem;
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field label {
		font-size: 0.84rem;
		font-weight: 800;
		color: #334155;
	}

	.field input {
		height: 2.9rem;
		padding: 0 0.9rem;
		border-radius: 0.95rem;
		border: 1px solid #cbd5e1;
		background: white;
		color: #0f172a;
		font-size: 0.96rem;
		outline: none;
		transition:
			border-color 0.16s ease,
			box-shadow 0.16s ease;
	}

	.field input:focus {
		border-color: #60a5fa;
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
	}

	.form-mini-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.scale-preview {
		padding: 0.85rem 0.9rem;
		border-radius: 0.95rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		font-size: 0.9rem;
	}

	.guidance-list {
		margin: 0;
		padding-left: 1.1rem;
		line-height: 1.9;
	}

	.mini-stats {
		display: grid;
		gap: 0.75rem;
	}

	.mini-stat {
		padding: 0.9rem 0.95rem;
		background: #f8fafc;
	}

	.mini-stat strong {
		display: block;
		font-size: 1.05rem;
		color: #0f172a;
		margin-top: 0.2rem;
	}

	@media (max-width: 1180px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 980px) {
		.hero,
		.summary-grid {
			grid-template-columns: 1fr;
		}

		.panel-head,
		.action-item {
			flex-direction: column;
			align-items: flex-start;
		}

		.hero-side-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 720px) {
		.card-metrics,
		.card-meta-row,
		.form-mini-grid,
		.hero-side-grid {
			grid-template-columns: 1fr;
		}

		.card-footer,
		.hero-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.primary-button,
		.secondary-button {
			width: 100%;
		}

		.card-footer form {
			width: 100%;
		}

		.classes-grid {
			grid-template-columns: 1fr;
		}
	}
</style>