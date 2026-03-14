<script lang="ts">
	import { resolve } from '$app/paths';

	type SubjectStatus = 'good' | 'attention' | 'pending';
	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';
	type ActionForm = {
		action?: 'claimInviteCode';
		message?: string;
		inviteCode?: string;
		success?: boolean;
	} | null;

	type SubjectCard = {
		subjectId: string;
		subjectName: string;
		score: number | null;
		progress: number | null;
		status: SubjectStatus;
		description: string;
	};

	type EnrollmentCard = {
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
		portal: { status: 'pending-link' | 'ready'; message: string };
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
		academicSummary: { title: string; description: string };
		longitudinal: {
			best_subject: string | null;
			worst_subject: string | null;
			recent_trend: Trend;
		} | null;
		enrollments: EnrollmentCard[];
	};

	export let form: ActionForm;

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
	const statusLabel = (value: SubjectStatus) => {
		if (value === 'good') return 'Bom desempenho';
		if (value === 'attention') return 'Pede atencao';
		return 'Sem publicacao';
	};
	const statusClass = (value: SubjectStatus) => value;
	const enrollmentStatusLabel = (value: EnrollmentCard['status']) => {
		if (value === 'active') return 'Ativo';
		if (value === 'pending') return 'Pendente';
		return 'Arquivado';
	};

	$: heroLine =
		data.portal.status === 'ready'
			? `Sua media publicada atual e ${averageLabel(data.summary.generalAverage)}.`
			: 'Seu acesso academico ainda nao foi concluido.';

	$: recommendationLine =
		data.portal.status !== 'ready'
			? 'Conclua o vinculo da sua conta para visualizar resultados publicados por materia.'
			: data.longitudinal?.recent_trend === 'improving'
				? 'Seu historico recente mostra melhora nas publicacoes mais recentes.'
				: data.longitudinal?.recent_trend === 'declining'
					? 'Seu historico recente pede mais atencao nas materias com menor desempenho.'
					: data.bestSubject && data.prioritySubject
						? `Seu melhor resultado atual esta em ${data.bestSubject.subjectName}, e a materia mais sensivel agora e ${data.prioritySubject.subjectName}.`
						: 'Assim que novas publicacoes entrarem, sua visao geral ficara ainda mais completa.';

	$: attentionTone =
		data.summary.attentionSubjects > 0 || data.summary.pendingSubjects > 0
			? 'highlight'
			: 'neutral';
</script>

<svelte:head>
	<title>Student Home - Class Insights</title>
</svelte:head>

{#if data.portal.status === 'pending-link'}
	<section class="hero">
		<div class="hero-copy">
			<div class="eyebrow">Inicio</div>
			<h1>Ola, {data.summary.studentName}</h1>
			<p>
				Seu portal ja esta pronto, mas ainda precisamos concluir o vinculo da sua conta com os dados
				academicos.
			</p>
			<p class="hero-subline">
				Se voce ja recebeu um codigo do professor, pode concluir esse passo agora sem sair da area
				do aluno.
			</p>
		</div>
		<div class="hero-metric waiting">
			<div class="metric-label">Status</div>
			<div class="metric-value small">Aguardando vinculo</div>
			<div class="metric-foot">{data.portal.message}</div>
		</div>
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Concluir vinculo</div>
				<h2>Adicionar codigo de convite</h2>
			</div>
		</div>

		<div class="claim-panel">
			<form method="POST" action="?/claimInviteCode" class="claim-form">
				<div class="claim-field">
					<label for="inviteCode">Codigo de convite</label>
					<input
						id="inviteCode"
						name="inviteCode"
						type="text"
						placeholder="Ex: 7B60B044657F"
						value={form?.inviteCode ?? ''}
						autocapitalize="characters"
						autocorrect="off"
						spellcheck="false"
					/>
				</div>
				<button type="submit" class="primary-link">Concluir vinculo</button>
			</form>

			{#if form?.action === 'claimInviteCode' && form?.message}
				<div
					class:success-banner={form.success}
					class:error-banner={!form.success}
					class="claim-feedback"
				>
					{form.message}
				</div>
			{/if}
		</div>
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Seus vinculos</div>
				<h2>Turmas encontradas para esta conta</h2>
			</div>
		</div>

		{#if data.enrollments.length > 0}
			<div class="enrollment-list">
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
		{:else}
			<div class="empty-state compact">
				<p>Nenhum vinculo academico foi encontrado para esta conta ainda.</p>
			</div>
		{/if}
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Resumo academico</div>
				<h2>{data.academicSummary.title}</h2>
			</div>
		</div>
		<div class="empty-state">
			<h3>Seu acesso academico ainda nao esta completo</h3>
			<p>{data.academicSummary.description}</p>
			<a href={resolve('/student/skills')} class="primary-link">Ir para materias</a>
		</div>
	</section>
{:else}
	<section class="hero">
		<div class="hero-copy">
			<div class="eyebrow">Inicio</div>
			<h1>Ola, {data.summary.studentName}</h1>
			<p>{heroLine}</p>
			<p class="hero-subline">{recommendationLine}</p>
			<div class="hero-actions">
				<a href={resolve('/student/journey')} class="secondary-link">Ver minha trajetoria</a>
				<a href={resolve('/student/skills')} class="primary-link">Ver minhas materias</a>
			</div>
		</div>
		<div class="hero-metric">
			<div class="metric-label">Media geral</div>
			<div class="metric-value">{averageLabel(data.summary.generalAverage)}</div>
			<div class="metric-foot">Baseada apenas em resultados publicados</div>
			{#if typeof data.summary.generalPercent === 'number'}
				<div class="hero-progress">
					<div class="hero-progress-label">Desempenho consolidado</div>
					<div class="hero-progress-track">
						<div class="hero-progress-fill" style={`width: ${data.summary.generalPercent}%`}></div>
					</div>
					<div class="hero-progress-value">
						{scoreFromPercentLabel(data.summary.generalPercent)}
					</div>
				</div>
			{/if}
		</div>
	</section>

	<section class="stats-row">
		<article class="mini-stat">
			<div class="mini-stat-label">Materias com publicacao</div>
			<div class="mini-stat-value">{data.summary.subjectsWithScore}</div>
		</article>
		<article class="mini-stat">
			<div class="mini-stat-label">Total de materias</div>
			<div class="mini-stat-value">{data.summary.totalSubjects}</div>
		</article>
		<article class="mini-stat">
			<div class="mini-stat-label">Bom desempenho</div>
			<div class="mini-stat-value">{data.summary.goodSubjects}</div>
		</article>
		<article class={`mini-stat ${attentionTone}`}>
			<div class="mini-stat-label">Pedem atencao</div>
			<div class="mini-stat-value">
				{data.summary.attentionSubjects + data.summary.pendingSubjects}
			</div>
		</article>
	</section>

	<section class="action-grid">
		<article class="action-card neutral">
			<div class="card-label">Evolucao recente</div>
			<h2>{trendLabel(data.longitudinal?.recent_trend)}</h2>
			<p>
				{#if data.longitudinal?.best_subject || data.longitudinal?.worst_subject}
					{#if data.longitudinal?.best_subject}Ponto forte atual: {data.longitudinal
							.best_subject}.{/if}
					{#if data.longitudinal?.worst_subject}
						Mais sensivel: {data.longitudinal.worst_subject}.{/if}
				{:else}
					Assim que houver mais publicacoes, sua tendencia recente aparecera aqui.
				{/if}
			</p>
			<div class="action-meta">
				<a href={resolve('/student/journey')} class="ghost-link">Abrir perfil longitudinal</a>
			</div>
		</article>

		<article class="action-card good">
			<div class="card-label">Melhor materia</div>
			<h2>{data.bestSubject?.subjectName ?? '--'}</h2>
			<p>
				{data.bestSubject?.description ??
					'Assim que houver resultados publicados, sua melhor materia aparecera aqui.'}
			</p>
			{#if data.bestSubject}
				<div class="action-meta">
					<div class="meta-chip">Media: {averageLabel(data.bestSubject.score)}</div>
					<div class="meta-chip">
						Desempenho: {scoreFromPercentLabel(data.bestSubject.progress)}
					</div>
				</div>
			{/if}
		</article>

		<article class="action-card attention">
			<div class="card-label">Materia prioritaria</div>
			<h2>{data.prioritySubject?.subjectName ?? '--'}</h2>
			<p>
				{data.prioritySubject?.description ??
					'Assim que houver resultados publicados, a principal prioridade aparecera aqui.'}
			</p>
			{#if data.prioritySubject}
				<div class="action-meta">
					{#if typeof data.prioritySubject.score === 'number'}<div class="meta-chip">
							Media: {averageLabel(data.prioritySubject.score)}
						</div>{/if}
					{#if typeof data.prioritySubject.progress === 'number'}<div class="meta-chip">
							Desempenho: {scoreFromPercentLabel(data.prioritySubject.progress)}
						</div>{/if}
				</div>
			{/if}
		</article>
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Resultados por materia</div>
				<h2>Visao consolidada do momento</h2>
			</div>
			<p>Seu portal agora considera apenas publicacoes fechadas pelo professor.</p>
		</div>

		{#if data.subjects.length > 0}
			<div class="subject-grid">
				{#each data.subjects as subject (subject.subjectId)}
					<article class="subject-card">
						<div class="subject-top">
							<div>
								<h3>{subject.subjectName}</h3>
								<p>{subject.description}</p>
							</div>
							<span class={`status-badge ${statusClass(subject.status)}`}
								>{statusLabel(subject.status)}</span
							>
						</div>
						<div class="subject-meta">
							<div class="meta-box">
								<span>Media</span><strong>{averageLabel(subject.score)}</strong>
							</div>
							<div class="meta-box">
								<span>Desempenho</span><strong>{scoreFromPercentLabel(subject.progress)}</strong>
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
			<div class="empty-state compact"><p>Nenhuma materia publicada no momento.</p></div>
		{/if}
	</section>

	<section class="panel summary-panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Seus vinculos</div>
				<h2>Leitura por turma</h2>
			</div>
			<p>O portal destaca a turma ativa, mas sua conta pode manter mais de um vinculo.</p>
		</div>

		{#if data.enrollments.length > 0}
			<div class="enrollment-list">
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
		{/if}
	</section>

	<section class="panel summary-panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Resumo academico</div>
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
	.summary-highlight p,
	.claim-panel p {
		color: #475569;
		line-height: 1.65;
	}
	.hero p {
		margin: 0.75rem 0 0;
		max-width: 720px;
	}
	.hero-subline {
		margin-top: 0.55rem;
	}
	.hero-actions,
	.action-meta {
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
	.hero-progress-track,
	.progress-track {
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
	.subject-grid,
	.enrollment-list {
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
	.enrollment-list {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.mini-stat,
	.action-card,
	.subject-card,
	.enrollment-card {
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
	.claim-panel {
		display: grid;
		gap: 1rem;
	}
	.claim-form {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.75rem;
		align-items: end;
	}
	.claim-field label {
		display: block;
		font-size: 0.82rem;
		font-weight: 800;
		color: #334155;
		margin-bottom: 0.35rem;
	}
	.claim-field input {
		width: 100%;
		height: 3rem;
		border-radius: 0.95rem;
		border: 1px solid #cbd5e1;
		padding: 0 1rem;
		font-size: 0.95rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.claim-feedback {
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		font-size: 0.92rem;
		font-weight: 700;
	}
	.success-banner {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.2);
		color: #166534;
	}
	.error-banner {
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.18);
		color: #b91c1c;
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
	.meta-chip {
		padding: 0.45rem 0.7rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(148, 163, 184, 0.18);
		font-size: 0.82rem;
		font-weight: 700;
		color: #334155;
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
	.enrollment-card {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.8rem;
		border-radius: 1rem;
		border: 1px solid rgba(148, 163, 184, 0.2);
		background: rgba(248, 250, 252, 0.92);
	}
	.enrollment-card.current {
		background: rgba(37, 99, 235, 0.08);
		border-color: rgba(37, 99, 235, 0.18);
	}
	.enrollment-card h3 {
		margin: 0;
		font-size: 1rem;
		color: #0f172a;
	}
	.enrollment-card p {
		margin: 0.35rem 0 0;
		font-size: 0.92rem;
		color: #475569;
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
	.status-badge.archived {
		background: rgba(226, 232, 240, 0.9);
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
		padding: 1.35rem;
		border-radius: 1rem;
		border: 1px dashed #cbd5e1;
		background: rgba(248, 250, 252, 0.9);
		text-align: center;
	}
	.empty-state.compact {
		padding: 1rem;
	}
	.primary-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		font-weight: 700;
		height: 2.9rem;
		padding: 0 1rem;
		border-radius: 0.92rem;
		font-size: 0.95rem;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
		border: none;
	}
	.secondary-link,
	.ghost-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		font-weight: 700;
		border-radius: 0.92rem;
		font-size: 0.95rem;
	}
	.secondary-link {
		height: 2.9rem;
		padding: 0 1rem;
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid rgba(148, 163, 184, 0.3);
		color: #1e293b;
	}
	.ghost-link {
		height: 2.5rem;
		padding: 0 0.9rem;
		background: rgba(255, 255, 255, 0.72);
		border: 1px solid rgba(148, 163, 184, 0.24);
		color: #1d4ed8;
	}
	@media (max-width: 980px) {
		.hero,
		.stats-row,
		.action-grid,
		.subject-grid,
		.enrollment-list {
			grid-template-columns: 1fr;
		}
		.panel-head,
		.claim-form {
			grid-template-columns: 1fr;
			flex-direction: column;
		}
	}
	@media (max-width: 640px) {
		.hero-actions,
		.action-meta {
			flex-direction: column;
			align-items: stretch;
		}
		.subject-top,
		.subject-meta {
			flex-direction: column;
			grid-template-columns: 1fr;
		}
		.primary-link {
			width: 100%;
		}
	}
</style>
