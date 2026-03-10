<script lang="ts">
	import { page } from '$app/stores';

	type ClassOption = {
		id: string;
		name: string;
		score_min: number;
		score_max: number;
		score_decimals: number;
	};

	type ValidationError = {
		job_id: string;
		row_index: number;
		column_index: number;
		column_name: string;
		message: string;
		value?: string;
	};

	type ApplyResult = {
		rowsTotal: number;
		studentsCreated: number;
		skillsCreated: number;
		scoresUpserted: number;
	};

	type FormState = {
		message?: string;
		success?: boolean;
		jobId?: string;
		headers?: string[];
		preview?: string[][];
		studentGuess?: number;
		delimiter?: ',' | ';' | '\t';
		scale?: {
			min: number;
			max: number;
			decimals: number;
		};
		statsPreview?: {
			rowsTotal: number;
			errors: number;
		};
		errors?: ValidationError[];
		applied?: ApplyResult;
	};

	type PreviewState = {
		jobId: string;
		headers: string[];
		preview: string[][];
		studentGuess: number;
		delimiter?: ',' | ';' | '\t';
	};

	export let data: {
		classes: ClassOption[];
	};

	$: formState = (($page.form ?? null) as FormState | null);

	let selectedClassId = '';
	let studentColIndex = 0;
	let selectedSkillCols = new Set<number>();

	let previewState: PreviewState = {
		jobId: '',
		headers: [],
		preview: [],
		studentGuess: 0,
		delimiter: undefined
	};

	let initializedForJobId = '';

	$: if (formState?.headers?.length && formState.jobId) {
		previewState = {
			jobId: formState.jobId,
			headers: formState.headers,
			preview: formState.preview ?? [],
			studentGuess: formState.studentGuess ?? 0,
			delimiter: formState.delimiter
		};
	}

	$: if (previewState.jobId && initializedForJobId !== previewState.jobId) {
		studentColIndex = previewState.studentGuess;

		const next = new Set<number>();
		for (let i = 0; i < previewState.headers.length; i++) {
			if (i !== previewState.studentGuess) next.add(i);
		}

		selectedSkillCols = next;
		initializedForJobId = previewState.jobId;
	}

	const toggleSkill = (i: number) => {
		const next = new Set(selectedSkillCols);
		if (next.has(i)) next.delete(i);
		else next.add(i);
		selectedSkillCols = next;
	};

	const delimiterLabel = (delimiter: ',' | ';' | '\t' | undefined) => {
		if (delimiter === ';') return 'ponto e vírgula (;)';
		if (delimiter === '\t') return 'tab';
		return 'vírgula (,)';
	};

	$: headers = previewState.headers;
	$: preview = previewState.preview;
	$: activeJobId = previewState.jobId;

	$: validationErrors = formState?.errors ?? [];
	$: validationStats = formState?.statsPreview ?? null;
	$: applied = formState?.applied ?? null;
	$: formMessage = formState?.message ?? null;
	$: defaultScale = formState?.scale ?? null;

	$: totalSelectedSkills = Array.from(selectedSkillCols).length;
</script>

<svelte:head>
	<title>Importação • Class Insights</title>
</svelte:head>

<section class="page-header">
	<div>
		<div class="eyebrow">Importação</div>
		<h1>Planilha mágica com staging</h1>
		<p>
			Suba um CSV, gere preview, mapeie colunas, rode a validação completa e só depois aplique
			tudo de forma atômica.
		</p>
	</div>
</section>

<section class="info-grid">
	<article class="info-card">
		<div class="info-label">Fluxo</div>
		<div class="info-value">Upload → Preview → Validar → Aplicar</div>
		<div class="info-foot">Sem aplicar direto no banco antes do preflight</div>
	</article>

	<article class="info-card">
		<div class="info-label">Regra de escala</div>
		<div class="info-value">Skill override &gt; turma</div>
		<div class="info-foot">Skill existente usa escala própria; skill nova usa escala default</div>
	</article>

	<article class="info-card">
		<div class="info-label">Modo</div>
		<div class="info-value">Staging seguro</div>
		<div class="info-foot">Rows staged, erros auditáveis e aplicação via RPC</div>
	</article>
</section>

<section class="panel">
	<div class="panel-head">
		<div>
			<div class="section-kicker">Etapa 1</div>
			<h2>Upload + preview</h2>
		</div>
		<p>Selecione a turma e envie um CSV para gerar um job de importação com preview inicial.</p>
	</div>

	<form method="POST" action="?/preview" enctype="multipart/form-data" class="upload-form">
		<div class="field">
			<label for="classId">Turma</label>
			<select id="classId" name="classId" bind:value={selectedClassId} required>
				<option value="" disabled>Selecione...</option>
				{#each data.classes as c}
					<option value={c.id}>
						{c.name} (escala padrão {c.score_min}–{c.score_max}, dec {c.score_decimals})
					</option>
				{/each}
			</select>
		</div>

		<div class="field">
			<label for="file">Arquivo CSV</label>
			<input id="file" type="file" name="file" accept=".csv" required />
		</div>

		<div class="actions">
			<button type="submit" class="primary-button">Gerar preview</button>
		</div>
	</form>

	{#if formMessage}
		<div class="feedback error">{formMessage}</div>
	{/if}

	{#if activeJobId}
		<div class="job-meta">
			<span>Job criado: <strong>{activeJobId}</strong></span>
			{#if previewState.delimiter}
				<span>Delimitador detectado: <strong>{delimiterLabel(previewState.delimiter)}</strong></span>
			{/if}
			<span>Colunas detectadas: <strong>{headers.length}</strong></span>
		</div>
	{/if}
</section>

{#if headers.length > 0}
	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Etapa 2</div>
				<h2>Mapear + validar</h2>
			</div>
			<p>
				Defina a coluna do aluno e escolha quais colunas devem ser tratadas como skills no
				preflight.
			</p>
		</div>

		<div class="helper-box">
			<strong>Como a validação funciona agora</strong>
			<p>
				Cada cabeçalho de skill é comparado com as skills já existentes na turma. Se a skill já
				existir, a validação usa a escala dela. Se não existir, usa a escala padrão da turma.
			</p>
		</div>

		<div class="preview-shell">
			<table class="preview-table">
				<thead>
					<tr>
						{#each headers as h, i}
							<th>{i}: {h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each preview as row}
						<tr>
							{#each headers as _, i}
								<td>{row[i] ?? ''}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<form method="POST" action="?/validate" class="mapping-form">
			<input type="hidden" name="jobId" value={activeJobId} />

			<div class="mapping-top">
				<div class="field">
					<label for="studentColIndex">Coluna do aluno</label>
					<select id="studentColIndex" name="studentColIndex" bind:value={studentColIndex}>
						{#each headers as h, i}
							<option value={i}>{i}: {h}</option>
						{/each}
					</select>
				</div>

				<div class="mapping-summary">
					<span>Skills selecionadas: <strong>{totalSelectedSkills}</strong></span>
				</div>
			</div>

			<div class="skill-picker">
				{#each headers as h, i}
					{#if i !== studentColIndex}
						<label class="skill-option">
							<input
								type="checkbox"
								name="skillColIndex"
								value={i}
								checked={selectedSkillCols.has(i)}
								onchange={() => toggleSkill(i)}
							/>
							<span>{i}: {h}</span>
						</label>
					{/if}
				{/each}
			</div>

			<div class="actions">
				<button type="submit" class="primary-button">Validar</button>
			</div>
		</form>
	</section>
{/if}

{#if validationStats}
	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Etapa 3</div>
				<h2>Resultado da validação</h2>
			</div>
			<p>Confira se o job está apto para aplicação ou se precisa corrigir o CSV/mapeamento.</p>
		</div>

		<div class="validation-stats">
			<div class="stat-box">
				<span class="stat-box-label">Linhas staged</span>
				<strong>{validationStats.rowsTotal}</strong>
			</div>

			<div class="stat-box">
				<span class="stat-box-label">Erros encontrados</span>
				<strong>{validationStats.errors}</strong>
			</div>

			{#if defaultScale}
				<div class="stat-box">
					<span class="stat-box-label">Escala default da turma</span>
					<strong>{defaultScale.min}–{defaultScale.max} • dec {defaultScale.decimals}</strong>
				</div>
			{/if}
		</div>

		{#if defaultScale}
			<p class="note">
				Observação: o card acima mostra a escala padrão da turma. Para skills já existentes com
				override, a validação usa a escala específica da própria skill.
			</p>
		{/if}

		{#if validationErrors.length > 0}
			<div class="feedback error">
				Foram encontrados <strong>{validationErrors.length}</strong> erros. Corrija o CSV ou o
				mapeamento e valide novamente.
			</div>

			<div class="error-list">
				{#each validationErrors as e}
					<div class="error-item">
						<div class="error-title">
							{#if e.row_index === 0}
								Header — coluna {e.column_index}
							{:else}
								Linha {e.row_index} — {e.column_name}
							{/if}
						</div>

						<div class="error-message">
							{e.message}
							{#if e.value}
								<span class="error-value">Valor: "{e.value}"</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if validationErrors.length === 0}
			<div class="feedback success">Sem erros. O job está validado e pode ser aplicado.</div>

			<div class="apply-box">
				<div>
					<h3>Aplicar no banco</h3>
					<p>
						A aplicação é feita de forma atômica no backend. Se houver falha, o job não deve
						ficar parcialmente aplicado.
					</p>
				</div>

				<form method="POST" action="?/apply">
					<input type="hidden" name="jobId" value={activeJobId || formState?.jobId || ''} />
					<button type="submit" class="primary-button">Aplicar</button>
				</form>
			</div>
		{/if}
	</section>
{/if}

{#if applied}
	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Etapa 4</div>
				<h2>Aplicação concluída</h2>
			</div>
			<p>Resumo do que foi criado e atualizado no banco após a aplicação do job.</p>
		</div>

		<div class="apply-results">
			<div class="result-card">
				<span>Linhas no job</span>
				<strong>{applied.rowsTotal}</strong>
			</div>
			<div class="result-card">
				<span>Alunos criados</span>
				<strong>{applied.studentsCreated}</strong>
			</div>
			<div class="result-card">
				<span>Skills criadas</span>
				<strong>{applied.skillsCreated}</strong>
			</div>
			<div class="result-card">
				<span>Scores upsertados</span>
				<strong>{applied.scoresUpserted}</strong>
			</div>
		</div>
	</section>
{/if}

<style>
	.page-header,
	.panel,
	.info-card,
	.result-card,
	.stat-box,
	.helper-box,
	.error-item {
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid rgba(148, 163, 184, 0.2);
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
		border-radius: 1.25rem;
	}

	.page-header {
		padding: 1.35rem;
		margin-bottom: 1rem;
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
		line-height: 1.15;
		color: #0f172a;
	}

	.page-header h1 {
		font-size: clamp(1.7rem, 2.5vw, 2.3rem);
	}

	.page-header p,
	.panel-head p,
	.helper-box p,
	.note,
	.apply-box p {
		color: #475569;
		line-height: 1.6;
		margin: 0.55rem 0 0;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.info-card {
		padding: 1rem;
	}

	.info-label {
		font-size: 0.8rem;
		font-weight: 800;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.35rem;
	}

	.info-value {
		font-size: 1.02rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.3;
	}

	.info-foot {
		margin-top: 0.45rem;
		font-size: 0.88rem;
		color: #475569;
		line-height: 1.5;
	}

	.panel {
		padding: 1.2rem;
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
		font-size: 0.94rem;
		margin-top: 0.15rem;
	}

	.upload-form,
	.mapping-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.mapping-top {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
	}

	.mapping-summary {
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #334155;
		font-size: 0.92rem;
		font-weight: 600;
		white-space: nowrap;
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

	.field input,
	.field select {
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

	.field input:focus,
	.field select:focus {
		border-color: #60a5fa;
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
	}

	.actions {
		display: flex;
		justify-content: flex-start;
	}

	.primary-button {
		height: 2.9rem;
		padding: 0 1rem;
		border-radius: 0.9rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		border: 0;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
		transition:
			transform 0.16s ease,
			box-shadow 0.16s ease;
	}

	.primary-button:hover {
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

	.job-meta {
		display: flex;
		gap: 0.9rem;
		flex-wrap: wrap;
		margin-top: 1rem;
		font-size: 0.9rem;
		color: #475569;
	}

	.helper-box {
		padding: 1rem;
		margin-bottom: 1rem;
		background: rgba(248, 250, 252, 0.9);
	}

	.helper-box strong {
		display: block;
		color: #0f172a;
		margin-bottom: 0.3rem;
	}

	.helper-box p {
		margin: 0;
		font-size: 0.92rem;
	}

	.preview-shell {
		overflow: auto;
		border: 1px solid #e2e8f0;
		border-radius: 1rem;
		background: white;
		margin-bottom: 1rem;
	}

	.preview-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
	}

	.preview-table th,
	.preview-table td {
		padding: 0.8rem 0.9rem;
		border-bottom: 1px solid #e2e8f0;
		text-align: left;
		vertical-align: top;
	}

	.preview-table th {
		background: #f8fafc;
		font-size: 0.82rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #475569;
	}

	.skill-picker {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.75rem;
	}

	.skill-option {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.85rem 0.95rem;
		border-radius: 1rem;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		cursor: pointer;
		font-size: 0.92rem;
		font-weight: 600;
		color: #0f172a;
	}

	.validation-stats,
	.apply-results {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.stat-box,
	.result-card {
		padding: 1rem;
	}

	.stat-box-label,
	.result-card span {
		display: block;
		font-size: 0.82rem;
		font-weight: 800;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.35rem;
	}

	.stat-box strong,
	.result-card strong {
		font-size: 1.05rem;
		color: #0f172a;
	}

	.note {
		font-size: 0.92rem;
		margin-bottom: 1rem;
	}

	.error-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.error-item {
		padding: 0.95rem 1rem;
	}

	.error-title {
		font-size: 0.9rem;
		font-weight: 800;
		color: #991b1b;
		margin-bottom: 0.3rem;
	}

	.error-message {
		font-size: 0.92rem;
		color: #475569;
		line-height: 1.5;
	}

	.error-value {
		display: inline-block;
		margin-left: 0.45rem;
		font-weight: 700;
		color: #7f1d1d;
	}

	.apply-box {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		border-radius: 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
	}

	.apply-box h3 {
		margin: 0;
		color: #0f172a;
		font-size: 1rem;
	}

	.apply-box p {
		margin-top: 0.35rem;
		font-size: 0.92rem;
		max-width: 560px;
	}

	@media (max-width: 980px) {
		.info-grid {
			grid-template-columns: 1fr;
		}

		.panel-head,
		.mapping-top,
		.apply-box {
			flex-direction: column;
			align-items: flex-start;
		}

		.mapping-summary {
			white-space: normal;
		}
	}

	@media (max-width: 640px) {
		.skill-picker {
			grid-template-columns: 1fr;
		}

		.primary-button {
			width: 100%;
		}

		.actions {
			width: 100%;
		}
	}
</style>