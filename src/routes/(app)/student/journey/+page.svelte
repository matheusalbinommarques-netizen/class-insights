<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatPercentAsGrade, formatPtBrGrade } from '$lib/utils/format';

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

	const averageLabel = (value: number | null) => formatPtBrGrade(value);
	const scoreFromPercentLabel = (value: number | null) => formatPercentAsGrade(value);
	const formatDate = (value: string | null) => {
		if (!value) return 'Sem data';
		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
	};
	const trendLabel = (value: Trend | null | undefined) => {
		if (value === 'improving') return 'Voce vem melhorando';
		if (value === 'declining') return 'Sua evolucao caiu um pouco';
		if (value === 'stable') return 'Voce esta estavel';
		return 'Ainda sem base suficiente';
	};
	const enrollmentStatusLabel = (value: EnrollmentItem['status']) => {
		if (value === 'active') return 'Ativa';
		if (value === 'pending') return 'Pendente';
		return 'Arquivada';
	};

	$: subjectOptions = data.subjects.map((subject) => ({ id: subject.id, name: subject.name }));
	$: filteredTimeline =
		activeSubject === 'all'
			? (data.longitudinal?.timeline ?? [])
			: (data.longitudinal?.timeline ?? []).filter((point) => point.subject_id === activeSubject);
	$: orderedTimeline = [...filteredTimeline].sort((a, b) =>
		b.assessment_date.localeCompare(a.assessment_date)
	);
	$: journeySummary =
		data.longitudinal?.recent_trend === 'improving'
			? 'Seu historico mais recente mostra melhora nas publicacoes.'
			: data.longitudinal?.recent_trend === 'declining'
				? 'Seu historico caiu um pouco e vale revisar as materias em atencao.'
				: 'Seu historico esta estavel com base no que ja foi publicado.';
</script>

<svelte:head>
	<title>Class Insights - Jornada do Aluno</title>
</svelte:head>

{#if data.journeyPortal.status === 'pending-link'}
	<section class="hero">
		<div>
			<p class="eyebrow">Jornada</p>
			<h1>Sua jornada aparece assim que o vinculo for concluido.</h1>
			<p>
				Quando a conta estiver ligada a sua turma, voce vai ver aqui a sequencia das avaliacoes ja
				publicadas.
			</p>
		</div>
		<div class="hero-side muted">
			<p class="side-label">Status</p>
			<strong>Aguardando vinculo</strong>
			<p>{data.journeyPortal.message}</p>
		</div>
	</section>
{:else}
	<section class="hero">
		<div>
			<p class="eyebrow">Jornada</p>
			<h1>Como seu progresso vem mudando.</h1>
			<p>
				{#if data.student.className}
					Turma atual: <strong>{data.student.className}</strong>.
				{/if}
				Esta pagina mostra sua sequencia de publicacoes de um jeito simples.
			</p>
		</div>
		<div class="hero-side">
			<p class="side-label">Leitura do momento</p>
			<strong>{trendLabel(data.longitudinal?.recent_trend)}</strong>
			<p>{journeySummary}</p>
		</div>
	</section>

	<section class="summary-strip">
		<article class="summary-card">
			<p class="card-kicker">Media atual</p>
			<strong>{averageLabel(data.summary.generalAverage)} / 10</strong>
		</article>
		<article class="summary-card">
			<p class="card-kicker">Onde voce foi melhor</p>
			<strong>{data.bestSubject?.name ?? '--'}</strong>
		</article>
		<article class={`summary-card ${data.prioritySubject ? 'attention' : 'good'}`}>
			<p class="card-kicker">Onde vale revisar</p>
			<strong>{data.prioritySubject?.name ?? 'Tudo dentro do esperado'}</strong>
		</article>
	</section>

	<section class="panel">
		<div class="section-head">
			<div>
				<p class="section-kicker">Filtro</p>
				<h2>Escolha uma materia</h2>
			</div>
			<a href={resolve('/student')} class="ghost-link">Voltar ao inicio</a>
		</div>

		<div class="filters">
			<button
				type="button"
				class:active={activeSubject === 'all'}
				class="filter-button"
				onclick={() => (activeSubject = 'all')}
			>
				Todas
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
		<div class="section-head">
			<div>
				<p class="section-kicker">Historico</p>
				<h2>Ultimas avaliacoes publicadas</h2>
			</div>
		</div>

		{#if orderedTimeline.length > 0}
			<div class="timeline">
				{#each orderedTimeline as point (point.assessment_id)}
					<article class="timeline-card">
						<div class="timeline-marker"></div>
						<div class="timeline-body">
							<p class="timeline-date">{formatDate(point.assessment_date)}</p>
							<h3>{point.assessment_title}</h3>
							<p>{point.subject_name}</p>
							<div class="timeline-metrics">
								<span>Desempenho: {scoreFromPercentLabel(point.normalized_percent)}</span>
								{#if typeof point.raw_score === 'number'}
									<span>Nota: {averageLabel(point.raw_score)}</span>
								{/if}
							</div>
						</div>
					</article>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<p>Nenhuma publicacao encontrada nesse recorte.</p>
			</div>
		{/if}
	</section>

	<section class="panel">
		<div class="section-head">
			<div>
				<p class="section-kicker">Por materia</p>
				<h2>Resumo rapido da sua base</h2>
			</div>
			<a href={resolve('/student/skills')} class="ghost-link">Abrir materias</a>
		</div>

		<div class="subject-list">
			{#each data.subjects as subject (subject.id)}
				<article class="subject-card">
					<div>
						<h3>{subject.name}</h3>
						<p>{subject.description}</p>
					</div>
					<div class="subject-side">
						<strong>{scoreFromPercentLabel(subject.progress)}</strong>
						<span>{subject.assessmentsCount} publicacao(oes)</span>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="panel">
		<div class="section-head">
			<div>
				<p class="section-kicker">Turmas</p>
				<h2>Vinculos desta conta</h2>
			</div>
		</div>

		<div class="subject-list">
			{#each data.enrollments as enrollment (enrollment.enrollmentId)}
				<article class={`subject-card ${enrollment.isCurrent ? 'current' : ''}`}>
					<div>
						<h3>{enrollment.className}</h3>
						<p>{enrollment.studentName}</p>
					</div>
					<div class="subject-side">
						<strong>{enrollmentStatusLabel(enrollment.status)}</strong>
						<span>{enrollment.isCurrent ? 'Turma ativa' : 'Outro vinculo'}</span>
					</div>
				</article>
			{/each}
		</div>
	</section>
{/if}

<style>
	.hero,
	.panel,
	.summary-card,
	.timeline-card,
	.subject-card,
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
	.timeline-date {
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

	p,
	.hero-side p,
	.subject-card span,
	.timeline-metrics span {
		color: #475569;
		line-height: 1.6;
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
	.summary-card strong,
	.subject-side strong {
		display: block;
		margin-top: 0.35rem;
		font-size: clamp(1.05rem, 4vw, 1.55rem);
		font-weight: 900;
		color: #0f172a;
	}

	.summary-strip,
	.subject-list {
		display: grid;
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.summary-card,
	.subject-card {
		padding: 1rem;
	}

	.summary-card.attention {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.2);
	}

	.summary-card.good {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.18);
	}

	.section-head {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
	}

	.filter-button,
	.ghost-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.75rem;
		padding: 0 1rem;
		border-radius: 999px;
		border: 1px solid #cbd5e1;
		background: white;
		font-size: 0.92rem;
		font-weight: 800;
		color: #0f172a;
		text-decoration: none;
		cursor: pointer;
	}

	.filter-button.active {
		background: rgba(37, 99, 235, 0.1);
		border-color: rgba(96, 165, 250, 0.35);
		color: #1d4ed8;
	}

	.timeline {
		position: relative;
		display: grid;
		gap: 0.9rem;
	}

	.timeline-card {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.9rem;
		padding: 1rem;
	}

	.timeline-marker {
		width: 0.75rem;
		height: 0.75rem;
		margin-top: 0.35rem;
		border-radius: 999px;
		background: #2563eb;
		box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.12);
	}

	.timeline-body {
		display: grid;
		gap: 0.35rem;
	}

	.timeline-metrics {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		margin-top: 0.35rem;
	}

	.subject-card {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.subject-card.current {
		background: rgba(37, 99, 235, 0.08);
		border-color: rgba(37, 99, 235, 0.18);
	}

	.subject-side span {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.92rem;
	}

	.empty-state {
		padding: 1rem;
	}

	@media (min-width: 768px) {
		.hero {
			grid-template-columns: minmax(0, 1.5fr) minmax(260px, 0.9fr);
		}

		.summary-strip {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.subject-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.section-head {
			flex-direction: row;
			align-items: start;
			justify-content: space-between;
		}

		.subject-card {
			flex-direction: row;
			align-items: start;
			justify-content: space-between;
		}
	}
</style>
