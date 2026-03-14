<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatPercentAsGrade, formatPtBrGrade } from '$lib/utils/format';

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
		isSelectable: boolean;
	};

	const currentPath = '/student';

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

	const averageLabel = (value: number | null) => formatPtBrGrade(value);
	const scoreFromPercentLabel = (value: number | null) => formatPercentAsGrade(value);
	const enrollmentStatusLabel = (value: EnrollmentCard['status']) => {
		if (value === 'active') return 'Ativa';
		if (value === 'pending') return 'Pendente';
		return 'Arquivada';
	};
	const trendLabel = (value: Trend | null | undefined) => {
		if (value === 'improving') return 'Voce vem melhorando';
		if (value === 'declining') return 'Sua evolucao caiu um pouco';
		if (value === 'stable') return 'Voce esta estavel';
		return 'Ainda sem base suficiente';
	};
	const statusLabel = (value: SubjectStatus) => {
		if (value === 'good') return 'Dentro do esperado';
		if (value === 'attention') return 'Vale revisar';
		return 'Sem avaliacao publicada';
	};
	const statusClass = (value: SubjectStatus) => value;

	$: generalSituation =
		data.summary.attentionSubjects > 0
			? `${data.summary.attentionSubjects} materia(s) pedem mais atencao agora.`
			: data.summary.pendingSubjects > 0
				? `${data.summary.pendingSubjects} materia(s) ainda nao tem publicacao suficiente.`
				: 'Tudo dentro do esperado neste momento.';

	$: progressMessage =
		data.longitudinal?.recent_trend === 'improving'
			? 'Seu progresso recente mostra melhora nas ultimas publicacoes.'
			: data.longitudinal?.recent_trend === 'declining'
				? 'Vale revisar as materias com menor resultado nas ultimas publicacoes.'
				: 'Seu progresso esta estavel com base no que ja foi publicado.';

	$: latestPublications = [...data.subjects]
		.filter((subject) => subject.status !== 'pending')
		.slice(0, 4);
</script>

<svelte:head>
	<title>Class Insights - Aluno</title>
</svelte:head>

{#if data.portal.status === 'pending-link'}
	<section class="hero">
		<div class="hero-copy">
			<p class="eyebrow">Aluno</p>
			<h1>Seu acesso ainda precisa ser vinculado.</h1>
			<p class="hero-text">
				Assim que o codigo de convite for confirmado, seu progresso publicado aparece aqui de forma
				simples.
			</p>
		</div>

		<div class="hero-side muted">
			<p class="side-label">Status</p>
			<strong>Aguardando vinculo</strong>
			<p>{data.portal.message}</p>
		</div>
	</section>

	<section class="panel">
		<div class="section-head">
			<div>
				<p class="section-kicker">Primeiro passo</p>
				<h2>Adicionar codigo de convite</h2>
			</div>
		</div>

		<form method="POST" action="?/claimInviteCode" class="claim-form">
			<label class="field">
				<span>Codigo</span>
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
			</label>
			<button type="submit" class="primary-link">Concluir vinculo</button>
		</form>

		{#if form?.action === 'claimInviteCode' && form?.message}
			<div class:success-banner={form.success} class:error-banner={!form.success} class="feedback">
				{form.message}
			</div>
		{/if}
	</section>

	<section class="panel">
		<div class="section-head">
			<div>
				<p class="section-kicker">Turmas encontradas</p>
				<h2>Vinculos desta conta</h2>
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
						<div class="enrollment-side">
							<span class={`status-badge ${enrollment.status}`}>
								{enrollmentStatusLabel(enrollment.status)}
							</span>
							{#if enrollment.isSelectable && !enrollment.isCurrent}
								<form method="POST" action={resolve('/student/switch-enrollment')}>
									<input type="hidden" name="enrollmentId" value={enrollment.enrollmentId} />
									<input type="hidden" name="redirectTo" value={currentPath} />
									<button type="submit" class="switch-link">Usar esta turma</button>
								</form>
							{/if}
						</div>
					</article>
				{/each}
			</div>
		{:else}
			<div class="empty-state compact">
				<p>Nenhum vinculo academico foi encontrado para esta conta ainda.</p>
			</div>
		{/if}
	</section>
{:else}
	<section class="hero">
		<div class="hero-copy">
			<p class="eyebrow">Seu progresso</p>
			<h1>Ola, {data.summary.studentName}.</h1>
			<p class="hero-text">
				{#if data.summary.className}
					Turma atual: <strong>{data.summary.className}</strong>.
				{/if}
				Aqui fica o que mais importa no seu momento atual.
			</p>
		</div>

		<div class="hero-side">
			<p class="side-label">Media atual</p>
			<strong>{averageLabel(data.summary.generalAverage)} / 10</strong>
			<p>Baseada apenas em resultados ja publicados.</p>
		</div>
	</section>

	<section class="focus-grid">
		<article class="focus-card">
			<p class="card-kicker">Media atual</p>
			<h2>{averageLabel(data.summary.generalAverage)} / 10</h2>
			<p>Seu resultado geral publicado ate aqui.</p>
		</article>

		<article class="focus-card">
			<p class="card-kicker">Situacao geral</p>
			<h2>{generalSituation}</h2>
			<p>Sem leitura tecnica. So o que pede atencao de verdade.</p>
		</article>

		<article class={`focus-card ${data.prioritySubject ? 'attention' : 'good'}`}>
			<p class="card-kicker">Onde vale revisar</p>
			<h2>{data.prioritySubject?.subjectName ?? 'Tudo dentro do esperado'}</h2>
			<p>{data.prioritySubject?.description ?? 'Nenhuma materia exige atencao agora.'}</p>
		</article>

		<article class="focus-card">
			<p class="card-kicker">Evolucao recente</p>
			<h2>{trendLabel(data.longitudinal?.recent_trend)}</h2>
			<p>{progressMessage}</p>
		</article>
	</section>

	<section class="panel">
		<div class="section-head">
			<div>
				<p class="section-kicker">Sua jornada</p>
				<h2>Veja seu historico sem complicacao</h2>
			</div>
			<a href={resolve('/student/journey')} class="ghost-link">Abrir jornada</a>
		</div>

		<div class="journey-strip">
			<div class="journey-item">
				<strong>{data.bestSubject?.subjectName ?? '--'}</strong>
				<span>Onde voce foi melhor</span>
			</div>
			<div class="journey-item">
				<strong>{data.prioritySubject?.subjectName ?? 'Tudo dentro do esperado'}</strong>
				<span>Onde vale revisar agora</span>
			</div>
			<div class="journey-item">
				<strong>{data.summary.subjectsWithScore}</strong>
				<span>Materias ja com publicacao</span>
			</div>
		</div>
	</section>

	<section class="panel">
		<div class="section-head">
			<div>
				<p class="section-kicker">Materias</p>
				<h2>Como voce esta em cada materia</h2>
			</div>
			<a href={resolve('/student/skills')} class="ghost-link">Ver todas</a>
		</div>

		{#if data.subjects.length > 0}
			<div class="subject-list">
				{#each data.subjects.slice(0, 4) as subject (subject.subjectId)}
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
							<div>
								<span>Media</span>
								<strong>{averageLabel(subject.score)} / 10</strong>
							</div>
							<div>
								<span>Desempenho</span>
								<strong>{scoreFromPercentLabel(subject.progress)}</strong>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{:else}
			<div class="empty-state compact">
				<p>Nenhuma materia publicada no momento.</p>
			</div>
		{/if}
	</section>

	<section class="panel">
		<div class="section-head">
			<div>
				<p class="section-kicker">Ultimas avaliacoes</p>
				<h2>O que entrou na sua leitura recente</h2>
			</div>
		</div>

		{#if latestPublications.length > 0}
			<div class="latest-list">
				{#each latestPublications as subject (subject.subjectId)}
					<article class="latest-card">
						<div>
							<h3>{subject.subjectName}</h3>
							<p>{subject.description}</p>
						</div>
						<div class="latest-side">
							<strong>{scoreFromPercentLabel(subject.progress)}</strong>
							<span>{averageLabel(subject.score)} / 10</span>
						</div>
					</article>
				{/each}
			</div>
		{:else}
			<div class="empty-state compact">
				<p>Assim que novas publicacoes entrarem, elas aparecem aqui.</p>
			</div>
		{/if}
	</section>
{/if}

<style>
	.hero,
	.panel,
	.focus-card,
	.subject-card,
	.latest-card,
	.enrollment-card,
	.empty-state {
		border: 1px solid rgba(148, 163, 184, 0.18);
		border-radius: 1.25rem;
		background: rgba(255, 255, 255, 0.94);
		box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);
	}

	.hero,
	.panel {
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.hero {
		display: grid;
		gap: 1rem;
	}

	.eyebrow,
	.section-kicker,
	.card-kicker,
	.side-label,
	.subject-meta span {
		font-size: 0.76rem;
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
		margin-top: 0.35rem;
		font-size: clamp(1.9rem, 6vw, 2.6rem);
	}

	.hero-text,
	.hero-side p,
	.focus-card p,
	.subject-card p,
	.latest-card p,
	.empty-state p,
	.enrollment-card p {
		color: #475569;
		line-height: 1.6;
	}

	.hero-copy {
		display: grid;
		gap: 0.75rem;
	}

	.hero-side {
		border-radius: 1rem;
		padding: 1rem;
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0.04));
	}

	.hero-side.muted {
		background: linear-gradient(180deg, rgba(148, 163, 184, 0.16), rgba(148, 163, 184, 0.08));
	}

	.hero-side strong,
	.focus-card h2 {
		display: block;
		margin-top: 0.4rem;
		font-size: clamp(1.2rem, 4vw, 1.8rem);
		font-weight: 900;
		color: #0f172a;
	}

	.focus-grid,
	.subject-list,
	.latest-list,
	.enrollment-list {
		display: grid;
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.focus-card,
	.subject-card,
	.latest-card,
	.enrollment-card {
		padding: 1rem;
	}

	.focus-card.attention {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.2);
	}

	.focus-card.good {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.18);
	}

	.section-head {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.journey-strip {
		display: grid;
		gap: 0.8rem;
	}

	.journey-item {
		border-radius: 1rem;
		padding: 0.95rem 1rem;
		background: #f8fafc;
		border: 1px solid rgba(148, 163, 184, 0.16);
	}

	.journey-item strong {
		display: block;
		font-size: 1rem;
		color: #0f172a;
	}

	.journey-item span {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.92rem;
		color: #64748b;
	}

	.subject-top,
	.latest-card,
	.enrollment-card {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.subject-meta {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: 0.9rem;
	}

	.subject-meta strong,
	.latest-side strong {
		display: block;
		margin-top: 0.28rem;
		color: #0f172a;
		font-size: 1rem;
	}

	.latest-side span {
		font-size: 0.9rem;
		color: #64748b;
	}

	.enrollment-side {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.enrollment-card.current {
		background: rgba(37, 99, 235, 0.08);
		border-color: rgba(37, 99, 235, 0.18);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: fit-content;
		padding: 0.42rem 0.72rem;
		border-radius: 999px;
		font-size: 0.74rem;
		font-weight: 800;
	}

	.status-badge.good {
		background: rgba(34, 197, 94, 0.12);
		color: #166534;
	}

	.status-badge.attention {
		background: rgba(245, 158, 11, 0.14);
		color: #b45309;
	}

	.status-badge.pending,
	.status-badge.archived {
		background: rgba(148, 163, 184, 0.16);
		color: #475569;
	}

	.status-badge.active {
		background: rgba(37, 99, 235, 0.12);
		color: #1d4ed8;
	}

	.primary-link,
	.ghost-link,
	.switch-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.75rem;
		padding: 0 1rem;
		border-radius: 999px;
		font-size: 0.92rem;
		font-weight: 800;
		text-decoration: none;
		border: 1px solid transparent;
		cursor: pointer;
	}

	.primary-link {
		background: #0f172a;
		color: white;
	}

	.ghost-link,
	.switch-link {
		background: white;
		border-color: #cbd5e1;
		color: #0f172a;
	}

	.claim-form {
		display: grid;
		gap: 0.85rem;
	}

	.field {
		display: grid;
		gap: 0.4rem;
	}

	.field span {
		font-size: 0.84rem;
		font-weight: 800;
		color: #334155;
	}

	.field input {
		height: 3rem;
		border-radius: 0.95rem;
		border: 1px solid #cbd5e1;
		padding: 0 1rem;
		font-size: 0.95rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.feedback {
		margin-top: 0.85rem;
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

	.empty-state.compact {
		padding: 1rem;
	}

	@media (min-width: 768px) {
		.hero {
			grid-template-columns: minmax(0, 1.5fr) minmax(260px, 0.9fr);
		}

		.focus-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.subject-list,
		.latest-list,
		.enrollment-list,
		.journey-strip {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.section-head {
			flex-direction: row;
			align-items: start;
			justify-content: space-between;
		}

		.latest-card,
		.enrollment-card {
			flex-direction: row;
			align-items: start;
			justify-content: space-between;
		}

		.claim-form {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: end;
		}
	}
</style>
