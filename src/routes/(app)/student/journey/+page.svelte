<script lang="ts">
	import { resolve } from '$app/paths';

	type SubjectStatus = 'good' | 'attention' | 'pending';
	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

	type SubjectItem = {
		id: string;
		name: string;
		code: string | null;
		score: number | null;
		progress: number | null;
		status: SubjectStatus;
		description: string;
		assessmentsCount: number;
		latestAssessmentTitle: string | null;
		latestAssessmentDate: string | null;
	};

	type TimelinePoint = {
		assessment_id: string;
		assessment_title: string;
		assessment_date: string;
		subject_id: string;
		subject_name: string;
		raw_score: number | null;
		normalized_percent: number | null;
		status: 'draft' | 'published';
	};

	type EnrollmentItem = {
		enrollmentId: string;
		studentId: string;
		classId: string;
		teacherId: string;
		status: 'pending' | 'active' | 'archived';
		joinedAt: string | null;
		leftAt: string | null;
		studentName: string;
		className: string;
		isCurrent: boolean;
	};

	export let data: {
		authUser: { id: string; email: string | null };
		journeyPortal: { status: 'pending-link' | 'ready'; message: string };
		student: { displayName: string; className: string | null };
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
		academicSummary: { title: string; description: string };
		longitudinal: {
			best_subject: string | null;
			worst_subject: string | null;
			recent_trend: Trend;
			timeline: TimelinePoint[];
		} | null;
		subjects: SubjectItem[];
		enrollments: EnrollmentItem[];
	};

	type SubjectFilter = 'all' | string;
	let activeSubject: SubjectFilter = 'all';

	const formatDate = (value: string | null) => {
		if (!value) return 'Sem data';
		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
	};

	const averageLabel = (value: number | null) =>
		typeof value === 'number' ? value.toFixed(1) : '--';

	const scoreFromPercentLabel = (value: number | null) =>
		typeof value === 'number' ? (value / 10).toFixed(1) : '--';

	const trendLabel = (value: Trend | null | undefined) => {
		if (value === 'improving') return 'Em melhora';
		if (value === 'declining') return 'Em queda';
		if (value === 'stable') return 'Estavel';
		return 'Dados insuficientes';
	};

	const trendClass = (value: Trend | null | undefined) => {
		if (value === 'improving') return 'improving';
		if (value === 'declining') return 'declining';
		if (value === 'stable') return 'stable';
		return 'insufficient';
	};
	const enrollmentStatusLabel = (value: EnrollmentItem['status']) => {
		if (value === 'active') return 'Ativo';
		if (value === 'pending') return 'Pendente';
		return 'Arquivado';
	};

	$: subjectOptions = data.subjects.map((subject) => ({
		id: subject.id,
		name: subject.name
	}));

	$: filteredTimeline =
		activeSubject === 'all'
			? (data.longitudinal?.timeline ?? [])
			: (data.longitudinal?.timeline ?? []).filter((point) => point.subject_id === activeSubject);

	$: orderedTimeline = [...filteredTimeline].sort((a, b) =>
		b.assessment_date.localeCompare(a.assessment_date)
	);

	$: pageTone =
		data.longitudinal?.recent_trend === 'declining'
			? 'attention'
			: data.longitudinal?.recent_trend === 'improving'
				? 'good'
				: 'neutral';

	$: journeyNarrative =
		data.longitudinal?.recent_trend === 'improving'
			? 'Seu ritmo mais recente mostra recuperacao nas publicacoes ja consolidadas.'
			: data.longitudinal?.recent_trend === 'declining'
				? 'Sua sequencia mais recente caiu e vale cruzar esta linha do tempo com as materias prioritarias.'
				: 'Sua trajetoria esta estavel por enquanto, sem oscilacao forte nas publicacoes mais recentes.';
</script>

<svelte:head>
	<title>Student Journey - Class Insights</title>
</svelte:head>

{#if data.journeyPortal.status === 'pending-link'}
	<section class="hero">
		<div>
			<div class="eyebrow">Trajetoria</div>
			<h1>Seu perfil longitudinal ainda esta em preparo</h1>
			<p>
				Assim que o vinculo academico da sua conta estiver completo, sua trajetoria publicada vai
				aparecer aqui por materia e por avaliacao.
			</p>
		</div>

		<div class="hero-card muted">
			<div class="hero-label">Status</div>
			<div class="hero-value small">Aguardando vinculo</div>
			<div class="hero-foot">{data.journeyPortal.message}</div>
		</div>
	</section>
{:else}
	<section class="hero">
		<div>
			<div class="eyebrow">Trajetoria</div>
			<h1>Perfil longitudinal de {data.student.displayName}</h1>
			<p>
				{#if data.student.className}
					Turma: <strong>{data.student.className}</strong>.
				{/if}
				Esta e a leitura da sua evolucao publicada ao longo do tempo, organizada por materia e avaliacao.
			</p>
			<p class="hero-subline">{journeyNarrative}</p>
			<div class="hero-actions">
				<a href={resolve('/student')} class="ghost-link">Voltar ao inicio</a>
				<a href={resolve('/student/skills')} class="primary-link">Cruzar com materias</a>
			</div>
		</div>

		<div class={`hero-card ${pageTone}`}>
			<div class="hero-label">Tendencia recente</div>
			<div class="hero-value">{trendLabel(data.longitudinal?.recent_trend)}</div>
			<div class="hero-foot">
				{#if data.longitudinal?.best_subject}
					Ponto forte atual: {data.longitudinal.best_subject}.
				{/if}
				{#if data.longitudinal?.worst_subject}
					Ponto de maior atencao: {data.longitudinal.worst_subject}.
				{/if}
			</div>
		</div>
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Vinculos</div>
				<h2>Turmas ligadas a esta conta</h2>
			</div>
			<p>O longitudinal considera a turma ativa, mas sua conta pode carregar mais de um vinculo.</p>
		</div>

		<div class="enrollment-grid">
			{#each data.enrollments as enrollment (enrollment.enrollmentId)}
				<article class={`enrollment-card ${enrollment.isCurrent ? 'current' : ''}`}>
					<div>
						<h3>{enrollment.className}</h3>
						<p>{enrollment.studentName}</p>
					</div>
					<span class={`status-badge ${enrollment.status}`}>
						{enrollmentStatusLabel(enrollment.status)}
					</span>
				</article>
			{/each}
		</div>
	</section>

	<section class="summary-grid">
		<article class="summary-card">
			<span class="summary-label">Media geral</span>
			<strong>{averageLabel(data.summary.generalAverage)}</strong>
			<p>Baseada apenas em resultados publicados.</p>
		</article>

		<article class="summary-card">
			<span class="summary-label">Materias com publicacao</span>
			<strong>{data.summary.subjectsWithScore}</strong>
			<p>Materias que ja alimentam sua leitura longitudinal.</p>
		</article>

		<article class={`summary-card trend ${trendClass(data.longitudinal?.recent_trend)}`}>
			<span class="summary-label">Leitura do momento</span>
			<strong>{trendLabel(data.longitudinal?.recent_trend)}</strong>
			<p>{data.academicSummary.description}</p>
		</article>
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Leitura guiada</div>
				<h2>Como interpretar esta trajetoria</h2>
			</div>
			<p>
				O objetivo aqui e entender a sequencia: o que melhorou, o que caiu e em qual materia isso
				aconteceu.
			</p>
		</div>

		<div class="reading-grid">
			<article class="reading-card good">
				<span>Melhor materia atual</span>
				<strong>{data.bestSubject?.name ?? '--'}</strong>
				<p>
					{data.bestSubject?.description ??
						'Ainda nao ha publicacao suficiente para destacar um ponto forte.'}
				</p>
			</article>

			<article class="reading-card attention">
				<span>Maior ponto de atencao</span>
				<strong>{data.prioritySubject?.name ?? '--'}</strong>
				<p>
					{data.prioritySubject?.description ??
						'Quando houver base publicada, a materia mais sensivel aparecera aqui.'}
				</p>
			</article>
		</div>
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Recortes</div>
				<h2>Filtrar sua trajetoria</h2>
			</div>
			<p>Escolha uma materia para enxergar a sequencia de publicacoes com mais foco.</p>
		</div>

		<div class="filters">
			<button
				type="button"
				class:active={activeSubject === 'all'}
				class="filter-button"
				onclick={() => (activeSubject = 'all')}
			>
				Todas as materias
			</button>
			{#each subjectOptions as subject (subject.id)}
				<button
					type="button"
					class:active={activeSubject === subject.id}
					class="filter-button"
					onclick={() => (activeSubject = subject.id)}
				>
					{subject.name}
				</button>
			{/each}
		</div>
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Linha do tempo</div>
				<h2>Publicacoes mais recentes</h2>
			</div>
			<p>
				Cada ponto abaixo representa uma avaliacao publicada que passou a valer no seu historico.
			</p>
		</div>

		{#if orderedTimeline.length > 0}
			<div class="timeline">
				{#each orderedTimeline as point (point.assessment_id)}
					<article class="timeline-card">
						<div class="timeline-date">
							<span>{formatDate(point.assessment_date)}</span>
						</div>
						<div class="timeline-body">
							<div class="timeline-top">
								<div>
									<h3>{point.assessment_title}</h3>
									<p>{point.subject_name}</p>
								</div>
								<div class="timeline-score">
									<div class="score-label">Desempenho</div>
									<div class="score-value">{scoreFromPercentLabel(point.normalized_percent)}</div>
								</div>
							</div>
							<div class="timeline-progress">
								<div class="timeline-progress-track">
									<div
										class={`timeline-progress-fill ${trendClass(data.longitudinal?.recent_trend)}`}
										style={`width: ${point.normalized_percent ?? 0}%`}
									></div>
								</div>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<h3>Nenhuma publicacao encontrada neste recorte</h3>
				<p>Escolha outra materia ou aguarde as proximas publicacoes do professor.</p>
			</div>
		{/if}
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Materias no longitudinal</div>
				<h2>Como cada materia entra na sua trajetoria</h2>
			</div>
			<p>Este resumo ajuda a ler onde sua base ja esta mais forte e onde ainda pede atencao.</p>
		</div>

		<div class="subject-grid">
			{#each data.subjects as subject (subject.id)}
				<article class="subject-card">
					<div class="subject-top">
						<div>
							<h3>{subject.name}</h3>
							<p>{subject.description}</p>
						</div>
						<span class={`status-badge ${subject.status}`}
							>{subject.assessmentsCount} publicacoes</span
						>
					</div>

					<div class="subject-meta">
						<div class="meta-box">
							<span>Media</span>
							<strong>{averageLabel(subject.score)}</strong>
						</div>
						<div class="meta-box">
							<span>Desempenho</span>
							<strong>{scoreFromPercentLabel(subject.progress)}</strong>
						</div>
					</div>

					<div class="subject-foot">
						{#if subject.latestAssessmentTitle}
							Ultima avaliacao: {subject.latestAssessmentTitle} em {formatDate(
								subject.latestAssessmentDate
							)}
						{:else}
							Aguardando a primeira publicacao desta materia.
						{/if}
					</div>
				</article>
			{/each}
		</div>
	</section>
{/if}

<style>
	.hero,
	.panel,
	.hero-card,
	.summary-card,
	.timeline-card,
	.subject-card,
	.empty-state {
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
		grid-template-columns: minmax(0, 1.65fr) minmax(260px, 0.95fr);
		gap: 1rem;
		align-items: stretch;
	}
	.eyebrow,
	.section-kicker,
	.hero-label,
	.summary-label,
	.score-label {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
	}
	h1,
	h2,
	h3,
	p {
		margin: 0;
	}
	h1,
	h2,
	h3 {
		color: #0f172a;
		line-height: 1.15;
	}
	h1 {
		font-size: clamp(1.8rem, 3vw, 2.45rem);
		margin-top: 0.35rem;
	}
	p,
	.hero-foot,
	.subject-foot {
		color: #475569;
		line-height: 1.6;
	}
	.hero p {
		margin-top: 0.75rem;
		max-width: 720px;
	}
	.hero-subline {
		font-size: 0.95rem;
	}
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1rem;
	}
	.hero-card {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0.05));
	}
	.hero-card.good {
		background: linear-gradient(180deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.06));
		border-color: rgba(34, 197, 94, 0.2);
	}
	.hero-card.attention {
		background: linear-gradient(180deg, rgba(245, 158, 11, 0.14), rgba(245, 158, 11, 0.06));
		border-color: rgba(245, 158, 11, 0.22);
	}
	.hero-card.muted {
		background: linear-gradient(180deg, rgba(148, 163, 184, 0.16), rgba(148, 163, 184, 0.08));
	}
	.hero-value {
		margin-top: 0.45rem;
		font-size: 1.45rem;
		font-weight: 900;
		color: #0f172a;
		line-height: 1.1;
	}
	.hero-value.small {
		font-size: 1.05rem;
	}
	.hero-foot {
		margin-top: 0.55rem;
		font-size: 0.92rem;
	}
	.summary-grid,
	.subject-grid,
	.reading-grid,
	.enrollment-grid {
		display: grid;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.summary-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.reading-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.enrollment-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.summary-card,
	.subject-card,
	.reading-card,
	.enrollment-card {
		padding: 1rem;
	}
	.summary-card strong {
		display: block;
		margin-top: 0.4rem;
		font-size: 1.3rem;
		font-weight: 900;
		color: #0f172a;
	}
	.summary-card p {
		margin-top: 0.5rem;
		font-size: 0.92rem;
	}
	.summary-card.trend.good {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.18);
	}
	.summary-card.trend.attention {
		background: rgba(245, 158, 11, 0.1);
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
		max-width: 450px;
		font-size: 0.94rem;
	}
	.reading-card {
		border-radius: 1.1rem;
		border: 1px solid rgba(148, 163, 184, 0.18);
		background: rgba(248, 250, 252, 0.9);
	}
	.reading-card.good {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.18);
	}
	.reading-card.attention {
		background: rgba(245, 158, 11, 0.12);
		border-color: rgba(245, 158, 11, 0.2);
	}
	.reading-card span {
		display: block;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
	}
	.reading-card strong {
		display: block;
		margin-top: 0.45rem;
		font-size: 1.08rem;
		font-weight: 900;
		color: #0f172a;
	}
	.reading-card p {
		margin-top: 0.45rem;
		font-size: 0.92rem;
	}
	.enrollment-card {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.8rem;
		border-radius: 1.1rem;
		border: 1px solid rgba(148, 163, 184, 0.18);
		background: rgba(248, 250, 252, 0.9);
	}
	.enrollment-card.current {
		background: rgba(37, 99, 235, 0.08);
		border-color: rgba(37, 99, 235, 0.2);
	}
	.enrollment-card h3 {
		font-size: 1rem;
	}
	.enrollment-card p {
		margin-top: 0.35rem;
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
	}
	.filter-button.active {
		background: rgba(37, 99, 235, 0.1);
		border-color: rgba(96, 165, 250, 0.35);
		color: #1d4ed8;
	}
	.timeline {
		display: grid;
		gap: 0.9rem;
	}
	.timeline-card {
		display: grid;
		grid-template-columns: 180px minmax(0, 1fr);
		overflow: hidden;
	}
	.timeline-date {
		padding: 1rem;
		background: rgba(248, 250, 252, 0.95);
		border-right: 1px solid rgba(148, 163, 184, 0.18);
		display: flex;
		align-items: center;
		font-weight: 800;
		color: #334155;
	}
	.timeline-body {
		padding: 1rem;
	}
	.timeline-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	.timeline-top h3 {
		font-size: 1rem;
	}
	.timeline-top p {
		margin-top: 0.3rem;
		font-size: 0.92rem;
	}
	.timeline-score {
		text-align: right;
		white-space: nowrap;
	}
	.score-value {
		margin-top: 0.25rem;
		font-size: 1.15rem;
		font-weight: 900;
		color: #1d4ed8;
	}
	.timeline-progress {
		margin-top: 0.9rem;
	}
	.timeline-progress-track {
		height: 0.8rem;
		border-radius: 999px;
		background: #dbe3ef;
		overflow: hidden;
	}
	.timeline-progress-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #2563eb, #1d4ed8);
	}
	.timeline-progress-fill.improving {
		background: linear-gradient(90deg, #22c55e, #16a34a);
	}
	.timeline-progress-fill.declining {
		background: linear-gradient(90deg, #f59e0b, #d97706);
	}
	.subject-grid {
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	}
	.subject-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.8rem;
		margin-bottom: 1rem;
	}
	.subject-top h3 {
		font-size: 1rem;
	}
	.subject-top p {
		margin-top: 0.35rem;
		font-size: 0.92rem;
	}
	.status-badge {
		padding: 0.45rem 0.75rem;
		border-radius: 999px;
		font-size: 0.76rem;
		font-weight: 800;
		white-space: nowrap;
		background: rgba(148, 163, 184, 0.18);
		color: #475569;
	}
	.status-badge.archived {
		background: rgba(226, 232, 240, 0.9);
		color: #475569;
	}
	.subject-meta {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
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
	.subject-foot {
		margin-top: 0.85rem;
		font-size: 0.9rem;
	}
	.empty-state {
		padding: 1.35rem;
		text-align: center;
	}
	.empty-state h3 {
		font-size: 1.1rem;
	}
	.empty-state p {
		margin-top: 0.6rem;
	}
	.primary-link,
	.ghost-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		font-weight: 700;
		border-radius: 0.92rem;
		font-size: 0.95rem;
	}
	.primary-link {
		height: 2.9rem;
		padding: 0 1rem;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
	}
	.ghost-link {
		height: 2.9rem;
		padding: 0 1rem;
		background: rgba(255, 255, 255, 0.76);
		border: 1px solid rgba(148, 163, 184, 0.24);
		color: #1e293b;
	}
	@media (max-width: 980px) {
		.hero,
		.summary-grid,
		.timeline-card,
		.reading-grid,
		.enrollment-grid {
			grid-template-columns: 1fr;
		}
		.panel-head {
			flex-direction: column;
		}
		.timeline-date {
			border-right: 0;
			border-bottom: 1px solid rgba(148, 163, 184, 0.18);
		}
	}
	@media (max-width: 640px) {
		.filters,
		.subject-meta {
			flex-direction: column;
			grid-template-columns: 1fr;
		}
		.hero-actions {
			flex-direction: column;
		}
		.filter-button {
			width: 100%;
		}
		.timeline-top,
		.subject-top {
			flex-direction: column;
		}
		.timeline-score {
			text-align: left;
		}
		.primary-link,
		.ghost-link {
			width: 100%;
		}
	}
</style>
