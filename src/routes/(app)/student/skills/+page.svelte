<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatPercentAsGrade, formatPtBrGrade } from '$lib/utils/format';

	type SubjectStatus = 'good' | 'attention' | 'pending';
	type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

	type SubjectItem = {
		id: string;
		name: string;
		progress: number | null;
		score: number | null;
		status: SubjectStatus;
		description: string;
		assessmentsCount: number;
		latestAssessmentTitle: string | null;
		latestAssessmentDate: string | null;
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
		subjectsPortal: { status: 'pending-link' | 'ready'; message: string };
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
		subjects: SubjectItem[];
		academicSummary: { title: string; description: string };
		longitudinal: { recent_trend: Trend } | null;
		enrollments: EnrollmentItem[];
	};

	type FilterKey = 'all' | 'good' | 'attention' | 'pending';
	let activeFilter: FilterKey = 'all';

	const filterOptions: Array<{ key: FilterKey; label: string }> = [
		{ key: 'all', label: 'Todas' },
		{ key: 'attention', label: 'Vale revisar' },
		{ key: 'good', label: 'Dentro do esperado' },
		{ key: 'pending', label: 'Sem avaliacao' }
	];

	const averageLabel = (value: number | null) => formatPtBrGrade(value);
	const scoreFromPercentLabel = (value: number | null) => formatPercentAsGrade(value);
	const statusLabel = (status: SubjectStatus) => {
		if (status === 'good') return 'Dentro do esperado';
		if (status === 'attention') return 'Vale revisar';
		return 'Sem avaliacao publicada';
	};
	const statusClass = (status: SubjectStatus) => status;
	const trendLabel = (value: Trend | null | undefined) => {
		if (value === 'improving') return 'Voce vem melhorando';
		if (value === 'declining') return 'Sua evolucao caiu um pouco';
		if (value === 'stable') return 'Voce esta estavel';
		return 'Ainda sem base suficiente';
	};
	const formatDate = (value: string | null) => {
		if (!value) return 'Sem data';
		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
	};
	const enrollmentStatusLabel = (status: EnrollmentItem['status']) => {
		if (status === 'active') return 'Ativa';
		if (status === 'pending') return 'Pendente';
		return 'Arquivada';
	};

	$: filteredSubjects =
		activeFilter === 'all'
			? data.subjects
			: data.subjects.filter((subject) => subject.status === activeFilter);
	$: orderedSubjects = [...filteredSubjects].sort((a, b) => {
		const order = (status: SubjectStatus) =>
			status === 'attention' ? 0 : status === 'pending' ? 1 : 2;
		const statusCompare = order(a.status) - order(b.status);
		if (statusCompare !== 0) return statusCompare;
		return (a.progress ?? 0) - (b.progress ?? 0);
	});
	$: pageMessage =
		data.longitudinal?.recent_trend === 'improving'
			? 'Seu resultado por materia vem melhorando nas publicacoes mais recentes.'
			: data.longitudinal?.recent_trend === 'declining'
				? 'As materias abaixo ajudam a entender onde vale revisar primeiro.'
				: 'Aqui esta sua foto atual por materia, usando apenas o que ja foi publicado.';
</script>

<svelte:head>
	<title>Class Insights - Materias do Aluno</title>
</svelte:head>

{#if data.subjectsPortal.status === 'pending-link'}
	<section class="hero">
		<div>
			<p class="eyebrow">Materias</p>
			<h1>Suas materias aparecem assim que o vinculo for concluido.</h1>
			<p>
				Quando sua conta estiver ligada a turma certa, esta tela mostra o que voce foi melhor e onde
				vale revisar.
			</p>
		</div>
		<div class="hero-side muted">
			<p class="side-label">Status</p>
			<strong>Aguardando vinculo</strong>
			<p>{data.subjectsPortal.message}</p>
		</div>
	</section>
{:else}
	<section class="hero">
		<div>
			<p class="eyebrow">Materias</p>
			<h1>Veja cada materia de um jeito direto.</h1>
			<p>
				{#if data.student.className}
					Turma atual: <strong>{data.student.className}</strong>.
				{/if}
				{pageMessage}
			</p>
		</div>
		<div class="hero-side">
			<p class="side-label">Media atual</p>
			<strong>{averageLabel(data.summary.generalAverage)} / 10</strong>
			<p>Tendencia recente: {trendLabel(data.longitudinal?.recent_trend)}</p>
		</div>
	</section>

	<section class="top-strip">
		<article class="top-card">
			<p class="card-kicker">Onde voce foi melhor</p>
			<strong>{data.bestSubject?.name ?? '--'}</strong>
		</article>
		<article class={`top-card ${data.prioritySubject ? 'attention' : 'good'}`}>
			<p class="card-kicker">Onde vale revisar</p>
			<strong>{data.prioritySubject?.name ?? 'Tudo dentro do esperado'}</strong>
		</article>
		<article class="top-card">
			<p class="card-kicker">Materias com publicacao</p>
			<strong>{data.summary.subjectsWithScore}</strong>
		</article>
	</section>

	<section class="panel">
		<div class="section-head">
			<div>
				<p class="section-kicker">Filtro</p>
				<h2>Escolha o que quer ver agora</h2>
			</div>
			<a href={resolve('/student/journey')} class="ghost-link">Abrir jornada</a>
		</div>

		<div class="filters">
			{#each filterOptions as option (option.key)}
				<button
					type="button"
					class:active={activeFilter === option.key}
					class="filter-button"
					onclick={() => (activeFilter = option.key)}>{option.label}</button
				>
			{/each}
		</div>
	</section>

	<section class="panel">
		<div class="section-head">
			<div>
				<p class="section-kicker">Resultado por materia</p>
				<h2>Seu panorama atual</h2>
			</div>
		</div>

		{#if orderedSubjects.length > 0}
			<div class="subject-grid">
				{#each orderedSubjects as subject (subject.id)}
					<article class="subject-card">
						<div class="subject-header">
							<div>
								<h3>{subject.name}</h3>
								<p>{subject.description}</p>
							</div>
							<span class={`status-badge ${statusClass(subject.status)}`}
								>{statusLabel(subject.status)}</span
							>
						</div>

						<div class="subject-metrics">
							<div>
								<span>Media</span>
								<strong>{averageLabel(subject.score)} / 10</strong>
							</div>
							<div>
								<span>Desempenho</span>
								<strong>{scoreFromPercentLabel(subject.progress)}</strong>
							</div>
						</div>

						<div class="subject-footer">
							<span>{subject.assessmentsCount} avaliacao(oes) publicada(s)</span>
							<span>{formatDate(subject.latestAssessmentDate)}</span>
						</div>

						{#if subject.latestAssessmentTitle}
							<p class="latest-note">Ultima avaliacao: {subject.latestAssessmentTitle}</p>
						{/if}
					</article>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<p>Nenhuma materia encontrada nesse filtro.</p>
			</div>
		{/if}
	</section>

	<section class="panel">
		<div class="section-head">
			<div>
				<p class="section-kicker">Turmas</p>
				<h2>Vinculos desta conta</h2>
			</div>
			<a href={resolve('/student')} class="ghost-link">Voltar ao inicio</a>
		</div>

		<div class="subject-grid compact-grid">
			{#each data.enrollments as enrollment (enrollment.enrollmentId)}
				<article class={`subject-card ${enrollment.isCurrent ? 'current' : ''}`}>
					<div>
						<h3>{enrollment.className}</h3>
						<p>{enrollment.studentName}</p>
					</div>
					<div class="subject-footer">
						<span>{enrollmentStatusLabel(enrollment.status)}</span>
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
	.top-card,
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
	.subject-metrics span,
	.subject-footer span {
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
	.subject-card p,
	.latest-note {
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
	.top-card strong,
	.subject-metrics strong {
		display: block;
		margin-top: 0.35rem;
		font-size: clamp(1.05rem, 4vw, 1.55rem);
		font-weight: 900;
		color: #0f172a;
	}

	.top-strip,
	.subject-grid {
		display: grid;
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.top-card,
	.subject-card {
		padding: 1rem;
	}

	.top-card.attention {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.2);
	}

	.top-card.good {
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

	.subject-card {
		display: grid;
		gap: 0.9rem;
	}

	.subject-card.current {
		background: rgba(37, 99, 235, 0.08);
		border-color: rgba(37, 99, 235, 0.18);
	}

	.subject-header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.subject-metrics {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.subject-footer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.latest-note {
		font-size: 0.92rem;
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

	.status-badge.pending {
		background: rgba(148, 163, 184, 0.16);
		color: #475569;
	}

	.empty-state {
		padding: 1rem;
	}

	@media (min-width: 768px) {
		.hero {
			grid-template-columns: minmax(0, 1.5fr) minmax(260px, 0.9fr);
		}

		.top-strip {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.subject-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.compact-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.section-head {
			flex-direction: row;
			align-items: start;
			justify-content: space-between;
		}

		.subject-header {
			flex-direction: row;
			align-items: start;
			justify-content: space-between;
		}
	}
</style>
