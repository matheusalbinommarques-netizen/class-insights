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

	export let data: {
		classes: ClassItem[];
		error: string | null;
	};

	let newMin = 0;
	let newMax = 10;
	let newDecimals = 0;

	$: formState = (($page.form ?? null) as FormState | null);
	$: formMessage = formState?.message ?? null;
	$: formSuccess = formState?.success ?? false;

	$: totalClasses = data.classes.length;

	$: widestScale =
		data.classes.length > 0
			? data.classes.reduce(
					(acc, current) => {
						return {
							min: Math.min(acc.min, current.score_min),
							max: Math.max(acc.max, current.score_max)
						};
					},
					{
						min: data.classes[0].score_min,
						max: data.classes[0].score_max
					}
				)
			: null;

	$: decimalProfiles = Array.from(new Set(data.classes.map((c) => c.score_decimals))).sort((a, b) => a - b);

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
</script>

<svelte:head>
	<title>Teacher Dashboard • Class Insights</title>
</svelte:head>

<section class="page-header">
	<div>
		<div class="eyebrow">Dashboard</div>
		<h1>Minhas turmas</h1>
		<p>
			Gerencie a estrutura base do produto: turmas, escalas padrão e acesso rápido à operação
			de cada classe.
		</p>
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
</section>

<section class="panel create-panel">
	<div class="panel-head">
		<div>
			<div class="section-kicker">Configuração</div>
			<h2>Criar nova turma</h2>
		</div>
		<p>
			Defina a escala padrão da turma. Skills podem herdar essa escala ou receber override depois.
		</p>
	</div>

	<form method="POST" action="?/createClass" class="create-form">
		<div class="field field-name">
			<label for="class-name">Nome da turma</label>
			<input id="class-name" name="name" placeholder="Ex: 2º Ano A" />
		</div>

		<div class="field field-small">
			<label for="score-min">Min</label>
			<input
				id="score-min"
				name="score_min"
				type="number"
				step="any"
				bind:value={newMin}
			/>
		</div>

		<div class="field field-small">
			<label for="score-max">Max</label>
			<input
				id="score-max"
				name="score_max"
				type="number"
				step="any"
				bind:value={newMax}
			/>
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
				Crie a primeira turma acima para começar a operar o fluxo professor → notas → insights.
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

<style>
	.page-header {
		margin-bottom: 1.5rem;
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

	.page-header h1,
	.panel-head h2 {
		margin: 0;
		color: #0f172a;
		line-height: 1.15;
	}

	.page-header h1 {
		font-size: clamp(1.7rem, 2.5vw, 2.3rem);
	}

	.page-header p,
	.panel-head p {
		margin: 0.55rem 0 0;
		color: #475569;
		max-width: 760px;
		line-height: 1.6;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.stat-card,
	.panel,
	.class-card {
		background: rgba(255, 255, 255, 0.9);
		border: 1px solid rgba(148, 163, 184, 0.2);
		border-radius: 1.25rem;
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
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

	.stat-foot {
		margin-top: 0.45rem;
		font-size: 0.88rem;
		color: #475569;
		line-height: 1.5;
	}

	.panel {
		padding: 1.25rem;
		margin-bottom: 1rem;
	}

	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
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

	.empty-state p {
		margin: 0;
		color: #475569;
		line-height: 1.6;
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

	@media (max-width: 980px) {
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
	}

	@media (max-width: 640px) {
		.create-form {
			grid-template-columns: 1fr;
		}

		.meta-grid {
			grid-template-columns: 1fr;
		}

		.class-actions {
			flex-direction: column;
		}

		.link-button,
		.danger-button {
			width: 100%;
		}
	}
</style>