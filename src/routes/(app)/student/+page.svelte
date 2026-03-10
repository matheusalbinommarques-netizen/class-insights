<script lang="ts">
	type Highlight = {
		title: string;
		description: string;
		type: 'good' | 'warn' | 'neutral';
	};

	export let data: {
		authUser: {
			id: string;
			email: string | null;
		};
		portal: {
			status: 'pending-link';
			message: string;
		};
		summary: {
			studentName: string;
			className: string | null;
			totalSkills: number;
			completedSkills: number;
			inProgressSkills: number;
			attentionSkills: number;
			overallProgress: number | null;
		};
		highlights: Highlight[];
	};

	const upcomingSections = [
		{
			title: 'Progresso por skill',
			description: 'Veja sua evolução em cada habilidade com barras, notas e leitura rápida.'
		},
		{
			title: 'Jornada de aprendizado',
			description: 'Acompanhe skills dominadas, em evolução e as que precisam de reforço.'
		},
		{
			title: 'Leitura simples do desempenho',
			description: 'Entenda rapidamente onde você está bem e onde vale revisar primeiro.'
		}
	];

	const guidanceCards = [
		{
			label: 'Status atual',
			title: 'Portal visualmente pronto',
			text: 'A base do portal do aluno já existe e agora depende do vínculo entre usuário autenticado e registro acadêmico.'
		},
		{
			label: 'Próximo passo',
			title: 'Conectar dados reais',
			text: 'Depois do vínculo auth → aluno, esta tela pode mostrar skills, progresso, turma e pontos de atenção.'
		},
		{
			label: 'Objetivo',
			title: 'Feedback mais claro',
			text: 'Transformar nota isolada em entendimento visual da evolução do aluno.'
		}
	];

	$: overallProgressLabel =
		typeof data.summary.overallProgress === 'number' ? `${data.summary.overallProgress}%` : '—';

	const highlightLabel = (type: Highlight['type']) => {
		if (type === 'good') return 'positive';
		if (type === 'warn') return 'warning';
		return 'neutral';
	};
</script>

<svelte:head>
	<title>Student Home • Class Insights</title>
</svelte:head>

<section class="hero">
	<div class="hero-copy">
		<div class="eyebrow">Início</div>
		<h1>Olá, {data.summary.studentName}</h1>
		<p>
			Este portal foi preparado para mostrar sua evolução de forma mais visual e simples. Agora a
			próxima camada é conectar seu login aos dados acadêmicos reais.
		</p>
	</div>

	<div class="hero-badge">
		<div class="badge-title">Status</div>
		<div class="badge-value">
			{data.portal.status === 'pending-link' ? 'Aguardando vínculo acadêmico' : 'Portal ativo'}
		</div>
		<div class="badge-foot">{data.portal.message}</div>
	</div>
</section>

<section class="summary-grid">
	<article class="summary-card">
		<div class="summary-label">Aluno</div>
		<div class="summary-value">{data.summary.studentName}</div>
		<div class="summary-foot">
			{data.authUser.email ?? 'E-mail indisponível'}
		</div>
	</article>

	<article class="summary-card">
		<div class="summary-label">Turma</div>
		<div class="summary-value">{data.summary.className ?? 'Ainda não vinculada'}</div>
		<div class="summary-foot">Aparecerá quando houver ligação real com o cadastro acadêmico</div>
	</article>

	<article class="summary-card">
		<div class="summary-label">Progresso geral</div>
		<div class="summary-value">{overallProgressLabel}</div>
		<div class="summary-foot">Indicador será calculado quando as skills reais forem conectadas</div>
	</article>
</section>

<section class="highlights">
	{#each guidanceCards as card}
		<article class="highlight-card">
			<div class="card-label">{card.label}</div>
			<h2>{card.title}</h2>
			<p>{card.text}</p>
		</article>
	{/each}
</section>

<section class="panel">
	<div class="panel-head">
		<div>
			<div class="section-kicker">Visão geral</div>
			<h2>Indicadores do aluno</h2>
		</div>
		<p>
			Esses cards já mostram a estrutura da dashboard do aluno. Quando o backend for ligado ao
			registro acadêmico, os números passarão a ser reais.
		</p>
	</div>

	<div class="metrics-grid">
		<div class="metric-card">
			<span class="metric-label">Total de skills</span>
			<strong>{data.summary.totalSkills}</strong>
		</div>
		<div class="metric-card">
			<span class="metric-label">Dominadas</span>
			<strong>{data.summary.completedSkills}</strong>
		</div>
		<div class="metric-card">
			<span class="metric-label">Em progresso</span>
			<strong>{data.summary.inProgressSkills}</strong>
		</div>
		<div class="metric-card">
			<span class="metric-label">Pontos de atenção</span>
			<strong>{data.summary.attentionSkills}</strong>
		</div>
	</div>
</section>

<section class="panel">
	<div class="panel-head">
		<div>
			<div class="section-kicker">O que vai aparecer aqui</div>
			<h2>Estrutura da home do aluno</h2>
		</div>
		<p>
			A home vai funcionar como uma visão rápida do momento atual, com foco em clareza,
			motivação e orientação.
		</p>
	</div>

	<div class="feature-grid">
		{#each upcomingSections as item}
			<div class="feature-card">
				<h3>{item.title}</h3>
				<p>{item.description}</p>
			</div>
		{/each}
	</div>
</section>

{#if data.highlights.length > 0}
	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Destaques</div>
				<h2>Leitura rápida</h2>
			</div>
		</div>

		<div class="highlight-list">
			{#each data.highlights as item}
				<div class={`highlight-row ${highlightLabel(item.type)}`}>
					<div>
						<strong>{item.title}</strong>
						<p>{item.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}

<section class="panel">
	<div class="panel-head">
		<div>
			<div class="section-kicker">Estado atual</div>
			<h2>Backend preparado</h2>
		</div>
	</div>

	<div class="empty-state">
		<div class="empty-icon">📚</div>
		<h3>Falta ligar usuário e aluno</h3>
		<p>
			O portal já tem layout, navegação e payload inicial do servidor. O próximo passo é criar o
			vínculo real entre o usuário autenticado e o registro do aluno no banco.
		</p>
		<a href="/student/skills" class="primary-link">Ver área de skills</a>
	</div>
</section>

<style>
	.hero,
	.panel,
	.highlight-card,
	.feature-card,
	.hero-badge,
	.summary-card,
	.metric-card,
	.highlight-row {
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
		grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.9fr);
		gap: 1rem;
		align-items: stretch;
	}

	.eyebrow,
	.section-kicker,
	.card-label,
	.badge-title,
	.summary-label,
	.metric-label {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
	}

	.hero h1,
	.panel-head h2,
	.highlight-card h2,
	.feature-card h3,
	.empty-state h3 {
		margin: 0;
		line-height: 1.15;
		color: #0f172a;
	}

	.hero h1 {
		font-size: clamp(1.75rem, 3vw, 2.4rem);
		margin-top: 0.35rem;
	}

	.hero p,
	.panel-head p,
	.highlight-card p,
	.feature-card p,
	.empty-state p,
	.badge-foot,
	.highlight-row p,
	.summary-foot {
		color: #475569;
		line-height: 1.6;
	}

	.hero p {
		margin: 0.7rem 0 0;
		max-width: 720px;
	}

	.hero-badge {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0.05));
	}

	.badge-value {
		margin-top: 0.45rem;
		font-size: 1.2rem;
		font-weight: 800;
		color: #1d4ed8;
		line-height: 1.2;
	}

	.badge-foot {
		margin-top: 0.45rem;
		font-size: 0.9rem;
	}

	.summary-grid,
	.highlights,
	.feature-grid,
	.metrics-grid {
		display: grid;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.summary-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.highlights,
	.feature-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.metrics-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.summary-card,
	.highlight-card,
	.feature-card,
	.metric-card {
		padding: 1rem;
	}

	.summary-value,
	.metric-card strong {
		display: block;
		margin-top: 0.45rem;
		font-size: 1.2rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.2;
	}

	.summary-foot {
		margin-top: 0.45rem;
		font-size: 0.9rem;
	}

	.highlight-card h2 {
		font-size: 1.05rem;
		margin-top: 0.45rem;
	}

	.highlight-card p,
	.feature-card p {
		margin: 0.5rem 0 0;
		font-size: 0.94rem;
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
		max-width: 430px;
		font-size: 0.94rem;
	}

	.feature-card h3 {
		font-size: 1rem;
	}

	.highlight-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.highlight-row {
		padding: 1rem;
	}

	.highlight-row.positive {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.2);
	}

	.highlight-row.warning {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.2);
	}

	.highlight-row.neutral {
		background: rgba(248, 250, 252, 0.92);
	}

	.highlight-row strong {
		color: #0f172a;
	}

	.highlight-row p {
		margin: 0.35rem 0 0;
		font-size: 0.94rem;
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
	}

	.empty-state p {
		margin: 0.65rem auto 0;
		max-width: 640px;
	}

	.primary-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-top: 1rem;
		height: 2.9rem;
		padding: 0 1rem;
		border-radius: 0.9rem;
		font-weight: 700;
		font-size: 0.95rem;
		text-decoration: none;
		border: 0;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
		transition:
			transform 0.16s ease,
			box-shadow 0.16s ease;
	}

	.primary-link:hover {
		transform: translateY(-1px);
	}

	@media (max-width: 900px) {
		.hero,
		.summary-grid,
		.highlights,
		.feature-grid,
		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.panel-head {
			flex-direction: column;
		}
	}
</style>