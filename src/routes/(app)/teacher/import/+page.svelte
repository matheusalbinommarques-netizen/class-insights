<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	type ClassOption = {
		id: string;
		name: string;
		score_min: number;
		score_max: number;
		score_decimals: number;
	};

	type ValidationIssue = {
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
			warnings?: number;
		};
		errors?: ValidationIssue[];
		warnings?: ValidationIssue[];
		applied?: ApplyResult;
	};

	type PreviewState = {
		jobId: string;
		headers: string[];
		preview: string[][];
		studentGuess: number;
		delimiter?: ',' | ';' | '\t';
	};

	type MappingState = {
		studentColIndex: number;
		selectedSkillCols: number[];
	};

	type ColumnRole = 'student' | 'skill' | 'ignored';
	type ValidationStatus = 'idle' | 'error' | 'warning' | 'success';

	export let data: {
		classes: ClassOption[];
	};

	const PREVIEW_STORAGE_KEY = 'classInsights.import.previewState';
	const MAPPING_STORAGE_PREFIX = 'classInsights.import.mapping';

	$: formState = ($page.form ?? null) as FormState | null;

	let selectedClassId = '';
	let studentColIndex = 0;
	let selectedSkillCols: number[] = [];

	let previewState: PreviewState = {
		jobId: '',
		headers: [],
		preview: [],
		studentGuess: 0,
		delimiter: undefined
	};

	let initializedForJobId = '';
	let hydratedFromStorage = false;

	$: if (formState?.headers?.length && formState.jobId) {
		previewState = {
			jobId: formState.jobId,
			headers: formState.headers,
			preview: formState.preview ?? [],
			studentGuess: formState.studentGuess ?? 0,
			delimiter: formState.delimiter
		};
		persistPreviewState(previewState);
	}

	onMount(() => {
		if (!browser) return;

		const storedPreview = readPreviewStateFromStorage();
		if (storedPreview && !previewState.jobId) {
			previewState = storedPreview;
		}

		hydratedFromStorage = true;
	});

	$: if (previewState.jobId && initializedForJobId !== previewState.jobId) {
		const restoredMapping = readMappingStateFromStorage(previewState.jobId);

		if (restoredMapping) {
			studentColIndex = restoredMapping.studentColIndex;

			const next: number[] = [];
			for (const col of restoredMapping.selectedSkillCols) {
				if (
					col >= 0 &&
					col < previewState.headers.length &&
					col !== restoredMapping.studentColIndex
				) {
					next.push(col);
				}
			}

			selectedSkillCols = next;
		} else {
			studentColIndex = previewState.studentGuess;

			const next: number[] = [];
			for (let i = 0; i < previewState.headers.length; i++) {
				if (i !== previewState.studentGuess) next.push(i);
			}

			selectedSkillCols = next;
		}

		initializedForJobId = previewState.jobId;
	}

	$: if (browser && hydratedFromStorage && previewState.jobId) {
		persistMappingState(previewState.jobId, {
			studentColIndex,
			selectedSkillCols: [...selectedSkillCols].sort((a, b) => a - b)
		});
	}

	const toggleSkill = (i: number) => {
		if (i === studentColIndex) return;

		selectedSkillCols = selectedSkillCols.includes(i)
			? selectedSkillCols.filter((value) => value !== i)
			: [...selectedSkillCols, i].sort((a, b) => a - b);
	};

	const selectAllSkills = () => {
		const next: number[] = [];
		for (let i = 0; i < headers.length; i++) {
			if (i !== studentColIndex) next.push(i);
		}
		selectedSkillCols = next;
	};

	const clearAllSkills = () => {
		selectedSkillCols = [];
	};

	const delimiterLabel = (delimiter: ',' | ';' | '\t' | undefined) => {
		if (delimiter === ';') return 'ponto e vírgula (;)';
		if (delimiter === '\t') return 'tab';
		return 'vírgula (,)';
	};

	const columnRole = (index: number): ColumnRole => {
		if (index === studentColIndex) return 'student';
		if (selectedSkillCols.includes(index)) return 'skill';
		return 'ignored';
	};

	const roleLabel = (role: ColumnRole) => {
		if (role === 'student') return 'Aluno';
		if (role === 'skill') return 'Skill';
		return 'Ignorada';
	};

	const previewCellClass = (index: number) => {
		const role = columnRole(index);
		if (role === 'student') return 'col-student';
		if (role === 'skill') return 'col-skill';
		return 'col-ignored';
	};

	const mappingKeyForJob = (jobId: string) => `${MAPPING_STORAGE_PREFIX}:${jobId}`;

	function persistPreviewState(state: PreviewState) {
		if (!browser || !state.jobId) return;

		try {
			sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(state));
		} catch {
			// Ignore storage write failures in unsupported/private contexts.
		}
	}

	function readPreviewStateFromStorage(): PreviewState | null {
		if (!browser) return null;

		try {
			const raw = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
			if (!raw) return null;

			const parsed = JSON.parse(raw) as PreviewState;

			if (!parsed?.jobId || !Array.isArray(parsed.headers) || !Array.isArray(parsed.preview)) {
				return null;
			}

			return parsed;
		} catch {
			return null;
		}
	}

	function persistMappingState(jobId: string, state: MappingState) {
		if (!browser || !jobId) return;

		try {
			sessionStorage.setItem(mappingKeyForJob(jobId), JSON.stringify(state));
		} catch {
			// Ignore storage write failures in unsupported/private contexts.
		}
	}

	function readMappingStateFromStorage(jobId: string): MappingState | null {
		if (!browser || !jobId) return null;

		try {
			const raw = sessionStorage.getItem(mappingKeyForJob(jobId));
			if (!raw) return null;

			const parsed = JSON.parse(raw) as MappingState;

			if (
				typeof parsed?.studentColIndex !== 'number' ||
				!Array.isArray(parsed?.selectedSkillCols)
			) {
				return null;
			}

			return parsed;
		} catch {
			return null;
		}
	}

	const classLabelById = (classId: string) => {
		const found = data.classes.find((c) => c.id === classId);
		if (!found) return 'Turma selecionada';
		return `${found.name} (${found.score_min}–${found.score_max}, dec ${found.score_decimals})`;
	};

	const validationStatusLabel = (status: ValidationStatus) => {
		if (status === 'error') return 'ERR';
		if (status === 'warning') return 'WARN';
		if (status === 'success') return 'OK';
		return '—';
	};

	$: headers = previewState.headers;
	$: preview = previewState.preview;
	$: activeJobId = previewState.jobId;

	$: validationErrors = formState?.errors ?? [];
	$: validationWarnings = formState?.warnings ?? [];
	$: validationStats = formState?.statsPreview ?? null;
	$: applied = formState?.applied ?? null;
	$: formMessage = formState?.message ?? null;
	$: defaultScale = formState?.scale ?? null;

	$: totalSelectedSkills = selectedSkillCols.length;
	$: ignoredColumnsCount = headers.length > 0 ? headers.length - 1 - totalSelectedSkills : 0;

	$: mappingIsValid =
		headers.length > 0 &&
		studentColIndex >= 0 &&
		studentColIndex < headers.length &&
		totalSelectedSkills > 0;

	$: headerErrors = validationErrors.filter((e) => e.row_index === 0);
	$: rowErrors = validationErrors.filter((e) => e.row_index > 0);

	$: headerWarnings = validationWarnings.filter((e) => e.row_index === 0);
	$: rowWarnings = validationWarnings.filter((e) => e.row_index > 0);

	$: selectedClassSummary =
		selectedClassId.trim().length > 0 ? classLabelById(selectedClassId) : null;

	$: validationStatus = (
		validationErrors.length > 0
			? 'error'
			: validationStats
				? validationWarnings.length > 0
					? 'warning'
					: 'success'
				: 'idle'
	) as ValidationStatus;

	$: if (selectedSkillCols.includes(studentColIndex)) {
		selectedSkillCols = selectedSkillCols.filter((value) => value !== studentColIndex);
	}
</script>

<svelte:head>
	<title>Importacao - Class Insights</title>
</svelte:head>

<section class="page-header">
	<div>
		<div class="eyebrow">Importacao legada</div>
		<h1>CSV por skill com staging seguro</h1>
		<p>
			Este fluxo continua disponivel como apoio operacional legado. A V1 academica prioriza
			materias, avaliacoes, resultados e publicacao; aqui o import ainda funciona por colunas de
			skill, com preview, validacao e aplicacao atomica.
		</p>
	</div>
</section>

<section class="info-grid">
	<article class="info-card">
		<div class="info-label">Papel na V1</div>
		<div class="info-value">Apoio legado, nao fluxo central</div>
		<div class="info-foot">Use quando o CSV realmente acelerar a operacao atual.</div>
	</article>

	<article class="info-card">
		<div class="info-label">Fluxo tecnico</div>
		<div class="info-value">Upload -> Preview -> Validar -> Aplicar</div>
		<div class="info-foot">Sem aplicar direto no banco antes do preflight</div>
	</article>

	<article class="info-card">
		<div class="info-label">Regra de escala</div>
		<div class="info-value">Importacao legada por skill</div>
		<div class="info-foot">
			Enquanto este import nao for reinterpretado no modelo academico, ele continua operando por
			colunas de skill e respeita a escala existente.
		</div>
	</article>
</section>

<section class="panel">
	<div class="panel-head">
		<div>
			<div class="section-kicker">Etapa 1</div>
			<h2>Upload + preview</h2>
		</div>
		<p>Selecione a turma e envie um CSV para gerar um job de importacao com preview inicial.</p>
	</div>

	<form method="POST" action="?/preview" enctype="multipart/form-data" class="upload-form">
		<div class="field">
			<label for="classId">Turma</label>
			<select id="classId" name="classId" bind:value={selectedClassId} required>
				<option value="" disabled>Selecione...</option>
				{#each data.classes as c (c.id)}
					<option value={c.id}>
						{c.name} (escala padrao {c.score_min}-{c.score_max}, dec {c.score_decimals})
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

	{#if selectedClassSummary}
		<div class="selection-summary">
			<span class="summary-chip">Turma alvo: <strong>{selectedClassSummary}</strong></span>
		</div>
	{/if}

	{#if formMessage}
		<div class="feedback error">{formMessage}</div>
	{/if}

	{#if activeJobId}
		<div class="job-meta">
			<span>Job criado: <strong>{activeJobId}</strong></span>
			{#if previewState.delimiter}
				<span>Delimitador detectado: <strong>{delimiterLabel(previewState.delimiter)}</strong></span
				>
			{/if}
			<span>Colunas detectadas: <strong>{headers.length}</strong></span>
			<span>Linhas no preview: <strong>{preview.length}</strong></span>
		</div>
	{/if}
</section>

{#if headers.length > 0}
	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Etapa 2</div>
				<h2>Mapear colunas do CSV legado</h2>
			</div>
			<p>
				Defina a coluna do aluno e escolha quais colunas continuam sendo tratadas como skills neste
				fluxo legado.
			</p>
		</div>

		<div class="helper-box">
			<strong>Como a validacao funciona neste legado</strong>
			<p>
				Cada cabecalho de skill e comparado com as skills ja existentes na turma. Se a skill ja
				existir, a validacao usa a escala dela. Se nao existir, usa a escala padrao da turma.
			</p>
		</div>

		<div class="mapping-overview">
			<div class="mapping-card student">
				<span class="mapping-card-label">Coluna do aluno</span>
				<strong>{headers[studentColIndex] ?? '—'}</strong>
			</div>

			<div class="mapping-card skill">
				<span class="mapping-card-label">Skills selecionadas</span>
				<strong>{totalSelectedSkills}</strong>
			</div>

			<div class="mapping-card ignored">
				<span class="mapping-card-label">Ignoradas</span>
				<strong>{ignoredColumnsCount}</strong>
			</div>
		</div>

		<div class="preview-shell">
			<table class="preview-table">
				<thead>
					<tr>
						{#each headers as h, i (`header-${i}-${h}`)}
							<th class={previewCellClass(i)}>
								<div class="col-title">{i}: {h}</div>
								<div class="col-role">{roleLabel(columnRole(i))}</div>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each preview as row, rowIndex (`preview-${rowIndex}`)}
						<tr>
							{#each headers as h, i (`cell-${rowIndex}-${i}-${h}`)}
								<td class={previewCellClass(i)}>{row[i] ?? ''}</td>
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
						{#each headers as h, i (`student-col-${i}-${h}`)}
							<option value={i}>{i}: {h}</option>
						{/each}
					</select>
				</div>

				<div class="mapping-summary">
					<span>Skills selecionadas: <strong>{totalSelectedSkills}</strong></span>
					<span>Ignoradas: <strong>{ignoredColumnsCount}</strong></span>
				</div>
			</div>

			<div class="mapping-actions">
				<button type="button" class="secondary-button slim" onclick={selectAllSkills}>
					Selecionar todas
				</button>
				<button type="button" class="secondary-button slim" onclick={clearAllSkills}>
					Limpar skills
				</button>
			</div>

			<div class="skill-picker">
				{#each headers as h, i (`skill-col-${i}-${h}`)}
					{#if i !== studentColIndex}
						<label class="skill-option" class:selected={selectedSkillCols.includes(i)}>
							<input
								type="checkbox"
								name="skillColIndex"
								value={i}
								checked={selectedSkillCols.includes(i)}
								onchange={() => toggleSkill(i)}
							/>
							<div class="skill-option-copy">
								<span class="skill-option-title">{i}: {h}</span>
								<span class="skill-option-meta">
									{selectedSkillCols.includes(i) ? 'Sera validada como skill' : 'Sera ignorada'}
								</span>
							</div>
						</label>
					{/if}
				{/each}
			</div>

			{#if !mappingIsValid}
				<div class="feedback warning">
					Selecione uma coluna valida de aluno e pelo menos 1 coluna de skill antes de validar.
				</div>
			{/if}

			<div class="actions">
				<button type="submit" class="primary-button" disabled={!mappingIsValid}> Validar </button>
			</div>
		</form>
	</section>
{/if}

{#if validationStats}
	<section class="panel">
		<div class="panel-head">
			<div>
				<div class="section-kicker">Etapa 3</div>
				<h2>Resultado da validacao</h2>
			</div>
			<p>
				Confira se o job esta apto para aplicacao ou se ainda precisa corrigir o CSV/mapeamento.
			</p>
		</div>

		<div class="validation-status-row">
			<div class={`status-badge-large ${validationStatus}`}>
				<span class="status-badge-label">Status</span>
				<strong>{validationStatusLabel(validationStatus)}</strong>
			</div>

			<div class="status-copy">
				{#if validationStatus === 'error'}
					<strong>Há erros bloqueantes.</strong>
					<p>Corrija os problemas antes de aplicar o job.</p>
				{:else if validationStatus === 'warning'}
					<strong>Validado com alertas.</strong>
					<p>O job pode ser aplicado, mas vale revisar os warnings antes.</p>
				{:else if validationStatus === 'success'}
					<strong>Validacao limpa.</strong>
					<p>Sem erros bloqueantes nem alertas relevantes.</p>
				{/if}
			</div>
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

			<div class="stat-box">
				<span class="stat-box-label">Warnings</span>
				<strong>{validationStats.warnings ?? 0}</strong>
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
				Foram encontrados <strong>{validationErrors.length}</strong> erros. Corrija o CSV ou o mapeamento
				e valide novamente.
			</div>

			<div class="error-summary-grid">
				<div class="stat-box compact">
					<span class="stat-box-label">Erros de header</span>
					<strong>{headerErrors.length}</strong>
				</div>

				<div class="stat-box compact">
					<span class="stat-box-label">Erros por linha</span>
					<strong>{rowErrors.length}</strong>
				</div>
			</div>

			<div class="error-list">
				{#each validationErrors as e (`${e.job_id}-${e.row_index}-${e.column_index}-${e.message}`)}
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

		{#if validationWarnings.length > 0}
			<div class="feedback warning">
				Foram encontrados <strong>{validationWarnings.length}</strong> warnings. Eles não bloqueiam a
				aplicação, mas merecem revisão.
			</div>

			<div class="warning-summary-grid">
				<div class="stat-box compact warning-box">
					<span class="stat-box-label">Warnings de header</span>
					<strong>{headerWarnings.length}</strong>
				</div>

				<div class="stat-box compact warning-box">
					<span class="stat-box-label">Warnings por linha</span>
					<strong>{rowWarnings.length}</strong>
				</div>
			</div>

			<div class="warning-list">
				{#each validationWarnings as w (`${w.job_id}-${w.row_index}-${w.column_index}-${w.message}`)}
					<div class="warning-item">
						<div class="warning-title">
							{#if w.row_index === 0}
								Header — coluna {w.column_index}
							{:else}
								Linha {w.row_index} — {w.column_name}
							{/if}
						</div>

						<div class="warning-message">
							{w.message}
							{#if w.value}
								<span class="warning-value">Valor: "{w.value}"</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if validationErrors.length === 0}
			{#if validationWarnings.length === 0}
				<div class="feedback success">
					Sem erros e sem warnings. O job está pronto para aplicar.
				</div>
			{/if}

			<div class="apply-box">
				<div>
					<h3>Aplicar no banco</h3>
					<p>
						A aplicação é feita de forma atômica no backend. Se houver falha, o job não deve ficar
						parcialmente aplicado.
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
				<h2>Aplicacao concluida</h2>
			</div>
			<p>Resumo do que foi criado e atualizado no banco apos a aplicacao do job.</p>
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
	.error-item,
	.warning-item,
	.mapping-card {
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
	.apply-box p,
	.status-copy p {
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

	.primary-button,
	.secondary-button {
		height: 2.9rem;
		padding: 0 1rem;
		border-radius: 0.9rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		transition:
			transform 0.16s ease,
			box-shadow 0.16s ease,
			opacity 0.16s ease;
	}

	.primary-button {
		border: 0;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
	}

	.secondary-button {
		border: 1px solid #cbd5e1;
		background: white;
		color: #0f172a;
	}

	.secondary-button.slim {
		height: 2.6rem;
		font-size: 0.9rem;
		padding: 0 0.9rem;
	}

	.primary-button:hover,
	.secondary-button:hover {
		transform: translateY(-1px);
	}

	.primary-button:disabled,
	.secondary-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
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

	.feedback.warning {
		background: rgba(245, 158, 11, 0.12);
		border: 1px solid rgba(245, 158, 11, 0.22);
		color: #92400e;
	}

	.selection-summary {
		margin-top: 1rem;
	}

	.summary-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.75rem 0.95rem;
		border-radius: 999px;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		color: #1d4ed8;
		font-size: 0.9rem;
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

	.mapping-overview {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.mapping-card {
		padding: 1rem;
	}

	.mapping-card.student {
		background: rgba(37, 99, 235, 0.1);
		border-color: rgba(96, 165, 250, 0.25);
	}

	.mapping-card.skill {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.2);
	}

	.mapping-card.ignored {
		background: rgba(248, 250, 252, 0.92);
	}

	.mapping-card-label {
		display: block;
		font-size: 0.82rem;
		font-weight: 800;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.35rem;
	}

	.mapping-card strong {
		color: #0f172a;
		font-size: 1rem;
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
		min-width: 170px;
	}

	.preview-table th {
		font-size: 0.82rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #475569;
	}

	.col-title {
		font-weight: 800;
		color: #0f172a;
		text-transform: none;
		letter-spacing: normal;
		font-size: 0.9rem;
	}

	.col-role {
		margin-top: 0.25rem;
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
	}

	.col-student {
		background: rgba(37, 99, 235, 0.08);
	}

	.col-skill {
		background: rgba(34, 197, 94, 0.08);
	}

	.col-ignored {
		background: white;
	}

	.mapping-top {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
	}

	.mapping-summary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #334155;
		font-size: 0.92rem;
		font-weight: 600;
	}

	.mapping-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.skill-picker {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.75rem;
	}

	.skill-option {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.85rem 0.95rem;
		border-radius: 1rem;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		cursor: pointer;
		font-size: 0.92rem;
		font-weight: 600;
		color: #0f172a;
		transition:
			border-color 0.16s ease,
			transform 0.16s ease,
			background 0.16s ease;
	}

	.skill-option:hover {
		transform: translateY(-1px);
		border-color: #cbd5e1;
	}

	.skill-option.selected {
		background: rgba(34, 197, 94, 0.08);
		border-color: rgba(34, 197, 94, 0.25);
	}

	.skill-option-copy {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.skill-option-title {
		color: #0f172a;
		font-weight: 700;
	}

	.skill-option-meta {
		font-size: 0.8rem;
		color: #64748b;
		font-weight: 600;
	}

	.validation-status-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		padding: 1rem;
		border-radius: 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
	}

	.status-badge-large {
		min-width: 110px;
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		text-align: center;
	}

	.status-badge-large.error {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.2);
		color: #991b1b;
	}

	.status-badge-large.warning {
		background: rgba(245, 158, 11, 0.12);
		border: 1px solid rgba(245, 158, 11, 0.2);
		color: #92400e;
	}

	.status-badge-large.success {
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(34, 197, 94, 0.2);
		color: #166534;
	}

	.status-badge-label {
		display: block;
		font-size: 0.76rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.2rem;
	}

	.status-badge-large strong {
		font-size: 1.25rem;
	}

	.status-copy strong {
		color: #0f172a;
	}

	.validation-stats,
	.apply-results,
	.error-summary-grid,
	.warning-summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.9rem;
		margin-bottom: 1rem;
	}

	.stat-box,
	.result-card {
		padding: 1rem;
	}

	.stat-box.compact {
		padding: 0.9rem 1rem;
	}

	.warning-box {
		background: rgba(255, 251, 235, 0.92);
		border-color: rgba(245, 158, 11, 0.2);
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

	.error-list,
	.warning-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.error-item,
	.warning-item {
		padding: 0.95rem 1rem;
	}

	.error-title {
		font-size: 0.9rem;
		font-weight: 800;
		color: #991b1b;
		margin-bottom: 0.3rem;
	}

	.warning-title {
		font-size: 0.9rem;
		font-weight: 800;
		color: #92400e;
		margin-bottom: 0.3rem;
	}

	.error-message,
	.warning-message {
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

	.warning-value {
		display: inline-block;
		margin-left: 0.45rem;
		font-weight: 700;
		color: #92400e;
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
		.info-grid,
		.mapping-overview {
			grid-template-columns: 1fr;
		}

		.panel-head,
		.mapping-top,
		.apply-box,
		.validation-status-row {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	@media (max-width: 640px) {
		.skill-picker,
		.validation-stats,
		.apply-results,
		.error-summary-grid,
		.warning-summary-grid {
			grid-template-columns: 1fr;
		}

		.primary-button,
		.secondary-button {
			width: 100%;
		}

		.actions {
			width: 100%;
		}

		.mapping-actions {
			width: 100%;
		}

		.mapping-actions :global(button) {
			width: 100%;
		}
	}
</style>
