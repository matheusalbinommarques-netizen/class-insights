<script lang="ts">
	import { page } from '$app/stores';

	type ClassItem = {
		id: string;
		name: string;
		created_at: string;
		score_min: number;
		score_max: number;
		score_decimals: number;
	};

	type FormState = {
		message?: string;
		success?: boolean;
	};

	type Props = {
		data: {
			classes: ClassItem[];
			error: string | null;
		};
	};

	let { data }: Props = $props();

	let newMin = $state(0);
	let newMax = $state(10);
	let newDecimals = $state(0);

	const formState = $derived(($page.form ?? null) as FormState | null);
	const formMessage = $derived(formState?.message ?? null);
	const formSuccess = $derived(formState?.success ?? false);

	const totalClasses = $derived(data.classes.length);

	const widestScale = $derived(
		data.classes.length > 0
			? data.classes.reduce(
					(acc, current) => ({
						min: Math.min(acc.min, current.score_min),
						max: Math.max(acc.max, current.score_max)
					}),
					{
						min: data.classes[0].score_min,
						max: data.classes[0].score_max
					}
				)
			: null
	);

	const decimalProfiles = $derived(
		Array.from(new Set(data.classes.map((c) => c.score_decimals))).sort((a, b) => a - b)
	);

	const latestClass = $derived(
		data.classes.length > 0
			? [...data.classes].sort(
					(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				)[0]
			: null
	);

	const normalizedScales = $derived(
		data.classes.map((c) => `${c.score_min}-${c.score_max}-dec-${c.score_decimals}`)
	);

	const uniqueScaleProfiles = $derived(Array.from(new Set(normalizedScales)));
	const scaleProfileCount = $derived(uniqueScaleProfiles.length);

	const classesWithDecimals = $derived(data.classes.filter((c) => c.score_decimals > 0).length);
	const classesWithoutDecimals = $derived(data.classes.filter((c) => c.score_decimals === 0).length);

	const averageScaleSpan = $derived(
		data.classes.length > 0
			? (
					data.classes.reduce((sum, current) => sum + (current.score_max - current.score_min), 0) /
					data.classes.length
				).toFixed(1)
			: null
	);

	const confirmDelete = (e: MouseEvent) => {
		if (!confirm('Deletar esta turma? Isso remove alunos, skills e scores.')) {
			e.preventDefault();
		}
	};

	const formatDate = (value: string) => {
		const date = new Date(value);

		if (Number.isNaN(date.getTime())) return 'Data indisponível';

		return new Intl.DateTimeFormat('pt-BR', {
			dateStyle: 'medium'
		}).format(date);
	};

	const formatScaleLabel = (item: ClassItem) =>
		`${item.score_min}–${item.score_max} • dec ${item.score_decimals}`;
</script>

<svelte:head>
	<title>Teacher Dashboard • Class Insights</title>
</svelte:head>

<section class="hero">
	<div class="hero-copy">
		<div class="eyebrow">Dashboard</div>
		<h1>Workspace do professor</h1>
		<p>
			Gerencie turmas, padronize escalas, entre no cockpit de cada classe e avance da operação
			para os insights.
		</p>

		<div class="hero-chips">
			<span class="hero-chip">Turmas: <strong>{totalClasses}</strong></span>
			<span class="hero-chip">
				Perfis de escala: <strong>{scaleProfileCount}</strong>
			</span>
			{#if averageScaleSpan}
				<span class="hero-chip">Amplitude média: <strong>{averageScaleSpan}</strong></span>
			{/if}
		</div>
	</div>

	<div class="hero-side">
		<div class="hero-side-label">Próxima ação</div>
		<h2>{totalClasses > 0 ? 'Entrar numa turma e operar' : 'Criar a primeira turma'}</h2>
		<p>
			{#if totalClasses > 0}
				Você já pode abrir uma turma para lançar notas, ajustar skills, gerar snapshots e analisar
				evolução.
			{:else}
				Comece definindo uma turma com a escala padrão que será herdada pelas skills.
			{/if}
		</p>
		<div class="hero-actions">
			<a href="/teacher/import" class="secondary-link">Ir para importação</a>
		</div>
	</div>
</section>

<section class="stats-grid">
	<article class="stat-card">
		<div class="stat-label">Total de turmas</div>
		<div class="stat-value">{totalClasses}</div>
		<div class="stat-foot">
			{#if totalClasses > 0}
				Pronto para navegar no cockpit de cada turma
			{:else}
				Crie sua primeira turma para começar
			{/if}
		</div>
	</article>

	<article class="stat-card">
		<div class="stat-label">Escala mais ampla</div>
		<div class="stat-value">
			{#if widestScale}
				{widestScale.min}–{widestScale.max}
			{:else}
				—
			{/if}
		</div>
		<div class="stat-foot">Faixa encontrada entre as turmas cadastradas</div>
	</article>

	<article class="stat-card">
		<div class="stat-label">Perfis de decimais</div>
		<div class="stat-value">
			{#if decimalProfiles.length > 0}
				{decimalProfiles.join(', ')}
			{:else}
				—
			{/if}
		</div>
		<div class="stat-foot">Quantidades de casas decimais hoje em uso</div>
	</article>

	<article class="stat-card">
		<div class="stat-label">Turma mais recente</div>
		<div class="stat-value small">
			{#if latestClass}
				{latestClass.name}
			{:else}
				—
			{/if}
		</div>
		<div class="stat-foot">
			{#if latestClass}
				Criada em {formatDate(latestClass.created_at)}
			{:else}
				Sem turmas cadastradas ainda
			{/if}
		</div>
	</article>
</section>

<section class="dashboard-grid">
	<div class="main-column">
		<section class="panel create-panel">
			<div class="panel-head">
				<div>
					<div class="section-kicker">Configuração</div>
					<h2>Criar nova turma</h2>
				</div>
				<p>
					Defina a escala padrão da turma. Skills podem herdar essa escala ou receber override
					depois.
				</p>
			</div>

			<form method="POST" action="?/createClass" class="create-form">
				<div class="field field-name">
					<label for="class-name">Nome da turma</label>
					<input id="class-name" name="name" placeholder="Ex: 2º Ano A" />
				</div>

				<div class="field field-small">
					<label for="score-min">Min</label>
					<input id="score-min" name="score_min" type="number" step="any" bind:value={newMin} />
				</div>

				<div class="field field-small">
					<label for="score-max">Max</label>
					<input id="score-max" name="score_max" type="number" step="any" bind:value={newMax} />
				</div>

				<div class="field field-small">
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

				<div class="actions">
					<button type="submit" class="primary-button">Criar turma</button>
				</div>
			</form>

			<div class="create-hints">
				<div class="hint-card">
					<strong>Escala inteira</strong>
					<p>Boa para contextos simples, como 0–10 com decimais 0.</p>
				</div>
				<div class="hint-card">
					<strong>Escala com precisão</strong>
					<p>Útil quando o professor precisa lançar 7,5 ou 8,25 com mais fidelidade.</p>
				</div>
			</div>

			{#if formMessage}
				<div class="feedback error">{formMessage}</div>
			{:else if formSuccess}
				<div class="feedback success">Turma criada com sucesso.</div>
			{/if}

			{#if data.error}
				<div class="feedback error">{data.error}</div>
			{/if}
		</section>

		<section class="panel classes-panel">
			<div class="panel-head">
				<div>
					<div class="section-kicker">Workspace</div>
					<h2>Turmas cadastradas</h2>
				</div>
				<p>
					Acesse uma turma para operar alunos, skills, notas, importação e insights.
				</p>
			</div>

			{#if data.classes.length === 0}
				<div class="empty-state">
					<h3>Nenhuma turma ainda</h3>
					<p>
						Crie a primeira turma acima para começar a operar o fluxo professor → notas →
						insights.
					</p>
				</div>
			{:else}
				<div class="classes-grid">
					{#each data.classes as c}
						<article class="class-card">
							<div class="class-top">
								<div>
									<h3>{c.name}</h3>
									<p>Criada em {formatDate(c.created_at)}</p>
								</div>

								<span class="badge">Turma</span>
							</div>

							<div class="meta-grid">
								<div class="meta-item">
									<span class="meta-label">Escala padrão</span>
									<strong>{c.score_min}–{c.score_max}</strong>
								</div>

								<div class="meta-item">
									<span class="meta-label">Decimais</span>
									<strong>{c.score_decimals}</strong>
								</div>
							</div>

							<div class="class-note">
								<div class="class-note-label">Perfil</div>
								<div class="class-note-value">{formatScaleLabel(c)}</div>
							</div>

							<div class="class-actions">
								<a href={`/teacher/${c.id}`} class="link-button">Abrir turma</a>

								<form method="POST" action="?/deleteClass">
									<input type="hidden" name="classId" value={c.id} />
									<button type="submit" class="danger-button" onclick={confirmDelete}>
										Deletar
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
		<section class="panel side-panel">
			<div class="panel-head compact">
				<div>
					<div class="section-kicker">Leitura rápida</div>
					<h2>Padrões atuais</h2>
				</div>
			</div>

			<div class="mini-stats">
				<div class="mini-stat">
					<span>Perfis de escala</span>
					<strong>{scaleProfileCount}</strong>
				</div>

				<div class="mini-stat">
					<span>Com decimais</span>
					<strong>{classesWithDecimals}</strong>
				</div>

				<div class="mini-stat">
					<span>Sem decimais</span>
					<strong>{classesWithoutDecimals}</strong>
				</div>
			</div>
		</section>

		<section class="panel side-panel">
			<div class="panel-head compact">
				<div>
					<div class="section-kicker">Ação rápida</div>
					<h2>Atalhos</h2>
				</div>
			</div>

			<div class="quick-links">
				<a href="/teacher/import" class="quick-link">
					<div>
						<strong>Importação com staging</strong>
						<p>Subir CSV, validar, aplicar.</p>
					</div>
					<span>→</span>
				</a>

				{#if latestClass}
					<a href={`/teacher/${latestClass.id}`} class="quick-link">
						<div>
							<strong>Abrir última turma</strong>
							<p>{latestClass.name}</p>
						</div>
						<span>→</span>
					</a>
				{/if}
			</div>
		</section>

		<section class="panel side-panel">
			<div class="panel-head compact">
				<div>
					<div class="section-kicker">Próximo nível</div>
					<h2>Depois daqui</h2>
				</div>
			</div>

			<ul class="next-steps">
				<li>Entrar na turma e operar alunos, skills e notas</li>
				<li>Gerar snapshots para histórico comparativo</li>
				<li>Transformar o cockpit em leitura prescritiva</li>
			</ul>
		</section>
	</aside>
</section>

<style>
	.hero,
	.stat-card,
	.panel,
	.class-card,
	.hint-card,
	.mini-stat,
	.quick-link {
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid rgba(148, 163, 184, 0.2);
		border-radius: 1.25rem;
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
	}

	.hero {
		padding: 1.35rem;
		margin-bottom: 1rem;
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
		gap: 1rem;
	}

	.hero-copy h1,
	.panel-head h2,
	.hero-side h2 {
		margin: 0;
		color: #0f172a;
		line-height: 1.15;
	}

	.hero-copy h1 {
		font-size: clamp(1.7rem, 2.5vw, 2.3rem);
	}

	.hero-copy p,
	.panel-head p,
	.hero-side p,
	.hint-card p,
	.quick-link p,
	.empty-state p {
		margin: 0.55rem 0 0;
		color: #475569;
		line-height: 1.6;
	}

	.eyebrow,
	.section-kicker {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 0.35rem;
	}

	.hero-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		margin-top: 1rem;
	}

	.hero-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.65rem 0.85rem;
		border-radius: 999px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		font-size: 0.88rem;
		color: #334155;
	}

	.hero-side {
		padding: 1rem;
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.03));
		border: 1px solid rgba(96, 165, 250, 0.22);
	}

	.hero-side-label {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #1d4ed8;
		margin-bottom: 0.35rem;
	}

	.hero-actions {
		margin-top: 1rem;
	}

	.secondary-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 2.9rem;
		padding: 0 1rem;
		border-radius: 0.9rem;
		text-decoration: none;
		font-weight: 700;
		font-size: 0.95rem;
		color: #0f172a;
		background: white;
		border: 1px solid #cbd5e1;
		transition: transform 0.16s ease;
	}

	.secondary-link:hover {
		transform: translateY(-1px);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.stat-card {
		padding: 1.1rem 1.15rem;
	}

	.stat-label {
		font-size: 0.82rem;
		font-weight: 700;
		color: #64748b;
		margin-bottom: 0.4rem;
	}

	.stat-value {
		font-size: 1.85rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.1;
	}

	.stat-value.small {
		font-size: 1.15rem;
		line-height: 1.3;
	}

	.stat-foot {
		margin-top: 0.45rem;
		font-size: 0.88rem;
		color: #475569;
		line-height: 1.5;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.85fr);
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
		padding: 1.25rem;
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
		margin-top: 0.15rem;
		font-size: 0.95rem;
	}

	.create-form {
		display: grid;
		grid-template-columns: minmax(0, 1.8fr) repeat(3, minmax(110px, 0.6fr)) auto;
		gap: 0.9rem;
		align-items: end;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field label {
		font-size: 0.86rem;
		font-weight: 700;
		color: #334155;
	}

	.field input {
		height: 2.9rem;
		padding: 0 0.9rem;
		border-radius: 0.9rem;
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

	.actions {
		display: flex;
		align-items: end;
	}

	.primary-button,
	.link-button,
	.danger-button {
		height: 2.9rem;
		padding: 0 1rem;
		border-radius: 0.9rem;
		font-weight: 700;
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
			border-color 0.16s ease;
	}

	.primary-button {
		border: 0;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
	}

	.primary-button:hover,
	.link-button:hover,
	.danger-button:hover {
		transform: translateY(-1px);
	}

	.create-hints {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.85rem;
		margin-top: 1rem;
	}

	.hint-card {
		padding: 0.95rem 1rem;
		background: rgba(248, 250, 252, 0.92);
	}

	.hint-card strong {
		color: #0f172a;
		font-size: 0.95rem;
	}

	.hint-card p {
		font-size: 0.9rem;
	}

	.feedback {
		margin-top: 1rem;
		padding: 0.9rem 1rem;
		border-radius: 0.95rem;
		font-size: 0.92rem;
		font-weight: 600;
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

	.empty-state {
		padding: 1.2rem;
		border-radius: 1rem;
		border: 1px dashed #cbd5e1;
		background: rgba(248, 250, 252, 0.85);
		text-align: center;
	}

	.empty-state h3 {
		margin: 0 0 0.45rem;
		color: #0f172a;
	}

	.classes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}

	.class-card {
		padding: 1.1rem;
	}

	.class-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.class-top h3 {
		margin: 0;
		font-size: 1.08rem;
		color: #0f172a;
	}

	.class-top p {
		margin: 0.35rem 0 0;
		font-size: 0.9rem;
		color: #64748b;
	}

	.badge {
		padding: 0.4rem 0.7rem;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.1);
		color: #1d4ed8;
		font-size: 0.76rem;
		font-weight: 800;
		white-space: nowrap;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.meta-item {
		padding: 0.8rem 0.85rem;
		border-radius: 0.95rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
	}

	.meta-label {
		display: block;
		font-size: 0.78rem;
		font-weight: 700;
		color: #64748b;
		margin-bottom: 0.2rem;
	}

	.meta-item strong {
		color: #0f172a;
		font-size: 0.98rem;
	}

	.class-note {
		padding: 0.9rem 0.95rem;
		border-radius: 0.95rem;
		background: rgba(37, 99, 235, 0.06);
		border: 1px solid rgba(96, 165, 250, 0.18);
		margin-bottom: 1rem;
	}

	.class-note-label {
		font-size: 0.76rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
		margin-bottom: 0.22rem;
	}

	.class-note-value {
		font-size: 0.94rem;
		font-weight: 700;
		color: #0f172a;
	}

	.class-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.link-button {
		background: #0f172a;
		color: white;
		border: 0;
		min-width: 128px;
	}

	.danger-button {
		background: white;
		color: #b91c1c;
		border: 1px solid rgba(239, 68, 68, 0.25);
		min-width: 110px;
	}

	.side-panel {
		padding: 1.1rem;
	}

	.mini-stats {
		display: grid;
		gap: 0.75rem;
	}

	.mini-stat {
		padding: 0.9rem 0.95rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.95rem;
	}

	.mini-stat span {
		display: block;
		font-size: 0.8rem;
		font-weight: 700;
		color: #64748b;
		margin-bottom: 0.25rem;
	}

	.mini-stat strong {
		font-size: 1.05rem;
		color: #0f172a;
	}

	.quick-links {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.quick-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.95rem 1rem;
		border-radius: 1rem;
		text-decoration: none;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		transition:
			transform 0.16s ease,
			border-color 0.16s ease;
	}

	.quick-link:hover {
		transform: translateY(-1px);
		border-color: #cbd5e1;
	}

	.quick-link strong {
		color: #0f172a;
		font-size: 0.96rem;
	}

	.quick-link p {
		margin-top: 0.25rem;
		font-size: 0.86rem;
	}

	.quick-link span:last-child {
		font-size: 1.2rem;
		font-weight: 800;
		color: #64748b;
	}

	.next-steps {
		margin: 0;
		padding-left: 1.1rem;
		color: #334155;
		line-height: 1.8;
	}

	@media (max-width: 1180px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 980px) {
		.hero,
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.panel-head {
			flex-direction: column;
		}

		.create-form {
			grid-template-columns: 1fr 1fr;
		}

		.field-name {
			grid-column: 1 / -1;
		}

		.actions {
			grid-column: 1 / -1;
		}

		.create-hints {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.create-form,
		.meta-grid {
			grid-template-columns: 1fr;
		}

		.class-actions {
			flex-direction: column;
		}

		.link-button,
		.danger-button,
		.secondary-link {
			width: 100%;
		}
	}
</style>