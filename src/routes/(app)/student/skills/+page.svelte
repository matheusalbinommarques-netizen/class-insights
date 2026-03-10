<script lang="ts">
	type SkillStatus = 'dominada' | 'evoluindo' | 'atenção';

	type SkillItem = {
		id: string;
		name: string;
		progress: number | null;
		score: number | null;
		status: SkillStatus;
		description: string | null;
	};

	export let data: {
		authUser: {
			id: string;
			email: string | null;
		};
		skillsPortal: {
			status: 'pending-link' | 'ready';
			message: string;
		};
		student: {
			displayName: string;
			className: string | null;
		};
		skills: SkillItem[];
		summary: {
			total: number;
			dominada: number;
			evoluindo: number;
			atencao: number;
		};
	};

	const roadmap = [
		'Agrupar skills por áreas de conhecimento',
		'Adicionar leitura temporal de evolução',
		'Exibir recomendações por skill crítica',
		'Transformar a visão em skill tree visual'
	];

	const statusLabel = (status: SkillStatus) => {
		if (status === 'dominada') return 'Dominada';
		if (status === 'evoluindo') return 'Evoluindo';
		return 'Ponto de atenção';
	};

	const statusClass = (status: SkillStatus) => {
		if (status === 'dominada') return 'good';
		if (status === 'evoluindo') return 'warn';
		return 'risk';
	};

	const progressLabel = (value: number | null) => {
		if (typeof value !== 'number') return '—';
		return `${value}%`;
	};

	const scoreLabel = (value: number | null) => {
		if (typeof value !== 'number') return '—';
		return value.toFixed(1);
	};

	$: strongestSkill =
		data.skills.length > 0
			? [...data.skills].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0]
			: null;

	$: weakestSkill =
		data.skills.length > 0
			? [...data.skills].sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0))[0]
			: null;
</script>

<svelte:head>
	<title>Student Skills • Class Insights</title>
</svelte:head>

<section class="hero">
	<div>
		<div class="eyebrow">Skills</div>
		<h1>Jornada de habilidades de {data.student.displayName}</h1>
		<p>
			{#if data.student.className}
				Turma: <strong>{data.student.className}</strong>. Aqui você acompanha seu progresso por
				habilidade e entende onde está indo bem e onde vale revisar primeiro.
			{:else}
				Esta área mostra suas habilidades e sua evolução. Assim que o vínculo acadêmico estiver
				completo, os dados reais aparecerão aqui.
			{/if}
		</p>
	</div>

	<div class="summary-card">
		<div class="summary-label">Status</div>
		<div class="summary-value">
			{data.skillsPortal.status === 'ready' ? 'Skills reais carregadas' : 'Aguardando vínculo'}
		</div>
		<div class="summary-foot">{data.skillsPortal.message}</div>
	</div>
</section>

<section class="summary-grid">
	<article class="metric-card">
		<span class="metric-label">Total</span>
		<strong>{data.summary.total}</strong>
	</article>

	<article class="metric-card">
		<span class="metric-label">Dominadas</span>
		<strong>{data.summary.dominada}</strong>
	</article>

	<article class="metric-card">
		<span class="metric-label">Evoluindo</span>
		<strong>{data.summary.evoluindo}</strong>
	</article>

	<article class="metric-card">
		<span class="metric-label">Atenção</span>
		<strong>{data.summary.atencao}</strong>
	</article>
</section>

{#if data.skills.length > 0}
	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Leitura rápida</div>
				<h2>Destaques da sua jornada</h2>
			</div>
		</div>

		<div class="insight-grid">
			<div class="insight-card good">
				<span class="insight-label">Ponto forte</span>
				<strong>{strongestSkill?.name ?? '—'}</strong>
				<p>
					{#if strongestSkill}
						Progresso atual: {progressLabel(strongestSkill.progress)}.
					{:else}
						Sem dados suficientes.
					{/if}
				</p>
			</div>

			<div class="insight-card warn">
				<span class="insight-label">Prioridade</span>
				<strong>{weakestSkill?.name ?? '—'}</strong>
				<p>
					{#if weakestSkill}
						Progresso atual: {progressLabel(weakestSkill.progress)}.
					{:else}
						Sem dados suficientes.
					{/if}
				</p>
			</div>
		</div>
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Mapa de skills</div>
				<h2>Seu progresso por habilidade</h2>
			</div>
			<p>
				Estas skills foram carregadas da sua turma e combinadas com suas notas já lançadas.
			</p>
		</div>

		<div class="skills-grid">
			{#each data.skills as skill}
				<article class="skill-card">
					<div class="skill-top">
						<div>
							<h3>{skill.name}</h3>
							<p>{skill.description ?? 'Descrição ainda não disponível.'}</p>
						</div>

						<span class={`status-badge ${statusClass(skill.status)}`}>
							{statusLabel(skill.status)}
						</span>
					</div>

					<div class="meta-row">
						<div class="meta-box">
							<span>Progresso</span>
							<strong>{progressLabel(skill.progress)}</strong>
						</div>

						<div class="meta-box">
							<span>Nota</span>
							<strong>{scoreLabel(skill.score)}</strong>
						</div>
					</div>

					<div class="progress-track">
						<div
							class={`progress-fill ${statusClass(skill.status)}`}
							style={`width: ${skill.progress ?? 0}%`}
						></div>
					</div>
				</article>
			{/each}
		</div>
	</section>
{:else}
	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Mapa de skills</div>
				<h2>Nenhuma skill disponível</h2>
			</div>
		</div>

		<div class="empty-state">
			<div class="empty-icon">🧩</div>
			<h3>Ainda não encontramos skills para você</h3>
			<p>
				Isso pode significar que seu vínculo acadêmico ainda não foi concluído, que sua turma
				ainda não possui skills cadastradas, ou que ainda não há dados lançados.
			</p>
		</div>
	</section>
{/if}

<section class="panel">
	<div class="panel-head">
		<div>
			<div class="section-kicker">Próximas evoluções</div>
			<h2>O que entra depois</h2>
		</div>
	</div>

	<div class="roadmap-box">
		<ul>
			{#each roadmap as item}
				<li>{item}</li>
			{/each}
		</ul>
	</div>
</section>

<section class="panel">
	<div class="panel-head">
		<div>
			<div class="section-kicker">Futuro</div>
			<h2>Skill tree visual</h2>
		</div>
		<p>
			A próxima camada vai transformar essa leitura em uma jornada mais gamificada, com sensação
			de progresso e níveis de evolução.
		</p>
	</div>

	<div class="tree-placeholder">
		<div class="tree-node unlocked">Base</div>
		<div class="tree-line"></div>
		<div class="tree-node in-progress">Evolução</div>
		<div class="tree-line"></div>
		<div class="tree-node locked">Próximo nível</div>
	</div>
</section>

<style>
	.hero,
	.panel,
	.summary-card,
	.skill-card,
	.roadmap-box,
	.tree-placeholder,
	.metric-card,
	.insight-card {
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
		grid-template-columns: minmax(0, 1.6fr) minmax(250px, 0.9fr);
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
	.skill-card h3 {
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
	.skill-card p,
	.summary-foot {
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

	.summary-value {
		font-size: 1.2rem;
		font-weight: 800;
		color: #1d4ed8;
		line-height: 1.2;
	}

	.summary-foot {
		margin-top: 0.45rem;
		font-size: 0.9rem;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.metric-card {
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

	.insight-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.insight-card {
		padding: 1rem;
	}

	.insight-card.good {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.2);
	}

	.insight-card.warn {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.2);
	}

	.insight-card strong {
		display: block;
		color: #0f172a;
		font-size: 1.05rem;
	}

	.insight-card p {
		margin: 0.45rem 0 0;
		font-size: 0.92rem;
		color: #475569;
	}

	.skills-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.skill-card {
		padding: 1rem;
	}

	.skill-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.8rem;
		margin-bottom: 1rem;
	}

	.skill-card h3 {
		font-size: 1rem;
	}

	.skill-card p {
		margin: 0.4rem 0 0;
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

	.status-badge.warn {
		background: rgba(245, 158, 11, 0.14);
		color: #92400e;
	}

	.status-badge.risk {
		background: rgba(239, 68, 68, 0.12);
		color: #991b1b;
	}

	.meta-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.85rem;
	}

	.meta-box {
		padding: 0.8rem 0.85rem;
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
		font-size: 0.98rem;
	}

	.progress-track {
		height: 0.8rem;
		border-radius: 999px;
		background: #e2e8f0;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 999px;
	}

	.progress-fill.good {
		background: linear-gradient(90deg, #22c55e, #16a34a);
	}

	.progress-fill.warn {
		background: linear-gradient(90deg, #f59e0b, #d97706);
	}

	.progress-fill.risk {
		background: linear-gradient(90deg, #ef4444, #dc2626);
	}

	.roadmap-box {
		padding: 1rem 1.1rem;
		background: rgba(248, 250, 252, 0.92);
	}

	.roadmap-box ul {
		margin: 0;
		padding-left: 1.1rem;
		color: #334155;
		line-height: 1.8;
	}

	.tree-placeholder {
		padding: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.8rem;
		flex-wrap: wrap;
		background: rgba(248, 250, 252, 0.9);
	}

	.tree-node {
		padding: 0.8rem 1rem;
		border-radius: 999px;
		font-weight: 800;
		font-size: 0.9rem;
	}

	.tree-node.unlocked {
		background: rgba(34, 197, 94, 0.14);
		color: #166534;
	}

	.tree-node.in-progress {
		background: rgba(245, 158, 11, 0.16);
		color: #92400e;
	}

	.tree-node.locked {
		background: rgba(148, 163, 184, 0.18);
		color: #475569;
	}

	.tree-line {
		width: 32px;
		height: 2px;
		background: #cbd5e1;
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
		max-width: 640px;
	}

	@media (max-width: 900px) {
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
		.skill-top,
		.meta-row,
		.tree-placeholder {
			flex-direction: column;
			grid-template-columns: 1fr;
		}

		.tree-line {
			width: 2px;
			height: 24px;
		}
	}
</style>